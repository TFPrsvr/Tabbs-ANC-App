# Audio Search System Administration Guide

## System Overview

The Audio Search system consists of multiple components that work together to provide fast, accurate search capabilities across audio content.

## Architecture Components

### **Core Services**
- **Search Engine**: Main search logic and API endpoints
- **Index Builder**: Background service for processing and indexing audio
- **Worker Pool**: Web workers for CPU-intensive operations
- **Cache Layer**: Redis/Memory cache for frequently accessed data

### **Data Storage**
- **Primary Database**: User data, audio metadata, search configurations
- **Search Indices**: Elasticsearch/Custom indices for fast text search
- **Audio Features**: Vector database for voice pattern matching
- **Cache Storage**: Temporary results and session data

## Deployment Configuration

### **Environment Variables**
```bash
# Search Service Configuration
SEARCH_WORKER_THREADS=4
SEARCH_INDEX_CACHE_SIZE=512MB
SEARCH_MAX_CONCURRENT_BUILDS=2
SEARCH_TIMEOUT_MS=30000

# Performance Tuning
VOICE_MATCHING_ENABLED=true
VOICE_SIMILARITY_THRESHOLD=0.6
INDEX_COMPRESSION_LEVEL=6
MAX_SEARCH_RESULTS=1000

# Resource Limits
MAX_AUDIO_FILE_SIZE=500MB
MAX_AUDIO_DURATION_HOURS=10
CONCURRENT_SEARCH_LIMIT=50
INDEX_BUILD_MEMORY_LIMIT=2GB
```

### **Service Configuration**
```yaml
# docker-compose.yml
services:
  search-service:
    image: anc-audio-search:latest
    environment:
      - NODE_ENV=production
      - SEARCH_WORKERS=4
    volumes:
      - ./search-indices:/app/indices
      - ./temp-audio:/app/temp
    memory: 4GB
    cpus: 2.0
```

## Monitoring & Alerting

### **Key Metrics to Monitor**

#### **Performance Metrics**
- **Search Response Time**: Target <500ms, Alert >2s
- **Index Build Time**: Target 30s/hour audio, Alert >120s/hour
- **Memory Usage**: Alert when >80% of allocated memory
- **CPU Usage**: Alert when >85% sustained for >5 minutes

#### **Business Metrics**
- **Search Success Rate**: Target >95%, Alert <90%
- **Search Volume**: Track daily/hourly search patterns
- **Index Build Queue**: Alert when >10 files waiting
- **Error Rate**: Alert when >1% of searches fail

### **Monitoring Setup**
```bash
# Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Key metrics to track:
# - search_request_duration_seconds
# - search_results_count
# - index_build_duration_seconds
# - active_search_sessions
# - memory_usage_bytes
# - cpu_usage_percent
```

### **Alerting Rules**
```yaml
# Prometheus alerting rules
groups:
  - name: audio-search-alerts
    rules:
      - alert: SearchResponseTimeSlow
        expr: search_request_duration_seconds > 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Search response time is slow"
          
      - alert: IndexBuildQueueHigh
        expr: index_build_queue_size > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Index build queue is backing up"
```

## Database Administration

### **Index Management**

#### **Search Index Optimization**
```sql
-- Monitor search index size
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name)) as size
FROM information_schema.tables 
WHERE table_schema = 'search_indices';

-- Rebuild corrupted indices
REINDEX INDEX search_words_idx;
REINDEX INDEX search_phrases_idx;
REINDEX INDEX speaker_segments_idx;
```

#### **Cleanup Operations**
```bash
# Daily cleanup script
#!/bin/bash

# Remove old temporary files
find /app/temp -name "*.wav" -mtime +1 -delete

# Clean up expired search caches
redis-cli EVAL "for i, name in ipairs(redis.call('KEYS', 'search:*')) do
  if redis.call('TTL', name) == -1 then
    redis.call('DEL', name)
  end
end" 0

# Archive old search logs
gzip /var/log/audio-search/search.log.1
```

### **Data Retention Policies**

#### **Search Results Cache**
- **TTL**: 1 hour for search results
- **Cleanup**: Automatic via Redis expiration
- **Size Limit**: 100MB per user session

#### **Audio Processing Temp Files**
- **Retention**: 24 hours after processing
- **Location**: `/tmp/audio-processing/`
- **Cleanup**: Daily cron job at 2 AM

#### **Search Logs**
- **Retention**: 30 days for detailed logs
- **Archive**: Compress and store for 1 year
- **Format**: JSON structured logs for analysis

## Scaling & Performance

### **Horizontal Scaling**

#### **Search Service Scaling**
```bash
# Scale search workers
docker service scale anc-search-service=4

# Add search replicas
kubectl scale deployment search-service --replicas=3
```

#### **Load Balancing Configuration**
```nginx
upstream search_backend {
    least_conn;
    server search-1:3000 max_fails=3 fail_timeout=30s;
    server search-2:3000 max_fails=3 fail_timeout=30s;
    server search-3:3000 max_fails=3 fail_timeout=30s;
}

location /api/search {
    proxy_pass http://search_backend;
    proxy_timeout 30s;
    proxy_cache search_cache;
    proxy_cache_valid 200 5m;
}
```

### **Performance Optimization**

#### **Index Optimization**
```javascript
// Batch index builds for efficiency
const batchSize = 5;
const pendingFiles = await getPendingIndexBuilds();
const batches = chunk(pendingFiles, batchSize);

for (const batch of batches) {
  await Promise.all(batch.map(buildSearchIndex));
}
```

#### **Cache Configuration**
```redis
# Redis cache optimization
CONFIG SET maxmemory 1gb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET timeout 300

# Pre-warm common searches
MSET 
  "search:common:meeting" "{\"results\":[...],\"cached\":true}"
  "search:common:action" "{\"results\":[...],\"cached\":true}"
```

## Troubleshooting Guide

### **Common Issues**

#### **Search Not Returning Results**
```bash
# Check index status
curl -X GET /api/admin/search/index/status

# Verify search index exists
ls -la /app/search-indices/

# Check index corruption
npm run verify-search-index --file-id=12345

# Rebuild index if corrupted
npm run rebuild-search-index --file-id=12345
```

#### **Slow Search Performance**
```bash
# Check current load
htop
iostat -x 1

# Monitor search queries
tail -f /var/log/audio-search/slow-queries.log

# Profile search operation
npm run profile-search --query="test" --debug=true
```

#### **Memory Issues**
```bash
# Check memory usage
free -h
cat /proc/meminfo

# Find memory leaks
node --inspect=0.0.0.0:9229 search-service.js
# Then use Chrome DevTools

# Clean up memory
systemctl restart audio-search-service
```

### **Emergency Procedures**

#### **Search Service Down**
1. **Immediate**: Restart search service
2. **Check logs**: Review error messages
3. **Fallback**: Enable basic text search only
4. **Notify**: Alert development team
5. **Monitor**: Watch service recovery

#### **Index Corruption**
1. **Detect**: Monitor for search result inconsistencies
2. **Isolate**: Identify corrupted index files
3. **Backup**: Create backup of current state
4. **Rebuild**: Regenerate indices from source audio
5. **Verify**: Test search functionality

## Security & Access Control

### **API Security**

#### **Rate Limiting**
```javascript
// Express rate limiting
const rateLimit = require('express-rate-limit');
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many search requests, please try again later.'
});

app.use('/api/search', searchLimiter);
```

#### **Search Access Control**
```javascript
// Verify user can access audio file
async function verifySearchAccess(userId, audioFileId) {
  const access = await db.query(`
    SELECT 1 FROM user_audio_files 
    WHERE user_id = $1 AND audio_file_id = $2
  `, [userId, audioFileId]);
  
  return access.length > 0;
}
```

### **Data Privacy**

#### **PII Handling**
- **Encryption**: All search indices encrypted at rest
- **Anonymization**: Remove personal identifiers from logs
- **Retention**: Automatic cleanup of user data on account deletion
- **Compliance**: GDPR/CCPA data export and deletion support

#### **Audit Logging**
```javascript
// Log all search operations
const auditLog = {
  timestamp: new Date().toISOString(),
  userId: req.user.id,
  action: 'search',
  query: sanitizeForLogging(req.body.query),
  audioFileId: req.body.fileId,
  results: results.length,
  responseTime: endTime - startTime
};

await saveAuditLog(auditLog);
```

## Backup & Recovery

### **Backup Strategy**

#### **Search Indices**
```bash
#!/bin/bash
# Daily backup script for search indices

BACKUP_DIR="/backups/search-indices/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup search indices
tar -czf "$BACKUP_DIR/search-indices.tar.gz" /app/search-indices/

# Backup database
pg_dump search_db > "$BACKUP_DIR/search_db.sql"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/" s3://audio-backups/search/ --recursive
```

#### **Recovery Procedures**
```bash
# Restore search indices
cd /app
tar -xzf /backups/search-indices/2023-10-15/search-indices.tar.gz

# Restore database
psql search_db < /backups/search-indices/2023-10-15/search_db.sql

# Restart services
systemctl restart audio-search-service
systemctl restart audio-index-builder
```

### **Disaster Recovery**

#### **Service Recovery Plan**
1. **Assessment** (0-15 min): Determine extent of outage
2. **Communication** (15-30 min): Notify stakeholders
3. **Restoration** (30-60 min): Restore from latest backup
4. **Verification** (60-90 min): Test all functionality
5. **Post-mortem** (24-48 hours): Analyze and improve

#### **Data Recovery Checklist**
- [ ] Latest backup identified and accessible
- [ ] Database restore completed successfully
- [ ] Search indices rebuilt and verified
- [ ] All services restarted and responding
- [ ] User functionality tested and working
- [ ] Monitoring and alerting restored

## Maintenance Schedules

### **Daily Tasks (Automated)**
- Clean temporary files
- Monitor search performance metrics
- Check error logs for anomalies
- Verify backup completion

### **Weekly Tasks**
- Review search usage analytics
- Update search indices for performance
- Check system resource usage trends
- Test disaster recovery procedures

### **Monthly Tasks**
- Optimize database queries and indices
- Review and update monitoring thresholds
- Analyze search patterns for optimization opportunities
- Update documentation and runbooks

### **Quarterly Tasks**
- Performance benchmark against baseline
- Security audit of search endpoints
- Capacity planning review
- Disaster recovery testing