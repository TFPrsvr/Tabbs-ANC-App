#!/usr/bin/env node

/**
 * Production Build Optimization Script
 * Optimizes the application for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build configuration
const config = {
  // Bundle analysis
  analyze: process.env.ANALYZE === 'true',

  // Compression settings
  compression: {
    gzip: true,
    brotli: true,
    level: 9
  },

  // Asset optimization
  assets: {
    images: true,
    minifyCSS: true,
    minifyJS: true,
    treeshake: true
  },

  // Performance budgets (in bytes)
  budgets: {
    maxJSBundle: 1024 * 1024, // 1MB
    maxCSSBundle: 256 * 1024,  // 256KB
    maxImageSize: 500 * 1024,  // 500KB
    maxTotalSize: 5 * 1024 * 1024 // 5MB
  }
};

function logStep(message) {
  console.log(`\n🔧 ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function runCommand(command, description) {
  try {
    logStep(description);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    logSuccess(`${description} completed`);
    return output;
  } catch (error) {
    logError(`${description} failed: ${error.message}`);
    throw error;
  }
}

function checkFileSize(filePath, maxSize, description) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    if (stats.size > maxSize) {
      logWarning(`${description} is ${sizeKB}KB (exceeds ${(maxSize/1024).toFixed(0)}KB limit)`);
      return false;
    } else {
      logSuccess(`${description} is ${sizeKB}KB (within limits)`);
      return true;
    }
  }
  return false;
}

function analyzeBundleSize() {
  logStep('Analyzing bundle sizes');

  const nextDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(nextDir, 'static');

  if (!fs.existsSync(staticDir)) {
    logWarning('Static directory not found. Build may not be complete.');
    return;
  }

  // Check JavaScript bundles
  const jsDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));

    let totalJSSize = 0;
    jsFiles.forEach(file => {
      const filePath = path.join(jsDir, file);
      const stats = fs.statSync(filePath);
      totalJSSize += stats.size;

      if (stats.size > config.budgets.maxJSBundle) {
        logWarning(`Large JS bundle: ${file} (${(stats.size/1024).toFixed(2)}KB)`);
      }
    });

    logSuccess(`Total JS size: ${(totalJSSize/1024).toFixed(2)}KB`);
  }

  // Check CSS bundles
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));

    let totalCSSSize = 0;
    cssFiles.forEach(file => {
      const filePath = path.join(cssDir, file);
      const stats = fs.statSync(filePath);
      totalCSSSize += stats.size;

      if (stats.size > config.budgets.maxCSSBundle) {
        logWarning(`Large CSS bundle: ${file} (${(stats.size/1024).toFixed(2)}KB)`);
      }
    });

    logSuccess(`Total CSS size: ${(totalCSSSize/1024).toFixed(2)}KB`);
  }
}

function optimizeImages() {
  logStep('Optimizing images');

  const publicDir = path.join(process.cwd(), 'public');
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

  function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        processDirectory(itemPath);
      } else if (imageExtensions.some(ext => item.toLowerCase().endsWith(ext))) {
        if (stats.size > config.budgets.maxImageSize) {
          logWarning(`Large image: ${item} (${(stats.size/1024).toFixed(2)}KB)`);
        }
      }
    });
  }

  processDirectory(publicDir);
  logSuccess('Image optimization check completed');
}

function generateBuildReport() {
  logStep('Generating build report');

  const report = {
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: 'production',
    node_version: process.version,
    build_options: config,
    performance_budgets: config.budgets
  };

  // Add bundle analysis if available
  const bundleAnalyzer = path.join(process.cwd(), '.next', 'analyze');
  if (fs.existsSync(bundleAnalyzer)) {
    report.bundle_analysis = 'Available in .next/analyze directory';
  }

  const reportPath = path.join(process.cwd(), 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  logSuccess(`Build report generated: ${reportPath}`);
}

function cleanupBuildArtifacts() {
  logStep('Cleaning up build artifacts');

  const artifactsToClean = [
    '.next/cache',
    'node_modules/.cache',
    '.eslintcache',
    'coverage'
  ];

  artifactsToClean.forEach(artifact => {
    const artifactPath = path.join(process.cwd(), artifact);
    if (fs.existsSync(artifactPath)) {
      try {
        if (fs.statSync(artifactPath).isDirectory()) {
          fs.rmSync(artifactPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(artifactPath);
        }
        logSuccess(`Cleaned: ${artifact}`);
      } catch (error) {
        logWarning(`Failed to clean ${artifact}: ${error.message}`);
      }
    }
  });
}

function setupProductionConfig() {
  logStep('Setting up production configuration');

  // Check if required environment files exist
  const envFiles = ['.env.production', '.env.local'];
  envFiles.forEach(envFile => {
    const envPath = path.join(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) {
      logWarning(`Environment file not found: ${envFile}`);
    } else {
      logSuccess(`Environment file found: ${envFile}`);
    }
  });

  // Verify production settings
  const requiredEnvVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logWarning(`Missing environment variables: ${missingVars.join(', ')}`);
  } else {
    logSuccess('All required environment variables are set');
  }
}

function validateBuild() {
  logStep('Validating build output');

  const requiredFiles = [
    '.next/BUILD_ID',
    '.next/routes-manifest.json',
    '.next/prerender-manifest.json'
  ];

  let buildValid = true;

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      logError(`Missing required build file: ${file}`);
      buildValid = false;
    } else {
      logSuccess(`Build file found: ${file}`);
    }
  });

  if (!buildValid) {
    throw new Error('Build validation failed');
  }

  logSuccess('Build validation passed');
}

async function main() {
  try {
    console.log('🚀 Starting production build optimization\n');

    // Pre-build setup
    setupProductionConfig();

    // Clean previous builds
    cleanupBuildArtifacts();

    // Install dependencies with exact versions
    runCommand('npm ci --production=false', 'Installing dependencies');

    // Run linting
    runCommand('npm run lint', 'Running ESLint');

    // Run type checking
    runCommand('npm run type-check', 'Running TypeScript type checking');

    // Run tests
    runCommand('npm test -- --coverage --watchAll=false', 'Running tests with coverage');

    // Build the application
    const buildCommand = config.analyze
      ? 'ANALYZE=true npm run build'
      : 'npm run build';
    runCommand(buildCommand, 'Building application');

    // Validate build output
    validateBuild();

    // Analyze bundle sizes
    analyzeBundleSize();

    // Optimize images
    optimizeImages();

    // Generate build report
    generateBuildReport();

    console.log('\n🎉 Production build optimization completed successfully!');

    // Final recommendations
    console.log('\n📋 Post-build recommendations:');
    console.log('   • Test the production build locally with: npm start');
    console.log('   • Review the build report: build-report.json');
    console.log('   • Check bundle analysis if enabled: .next/analyze/');
    console.log('   • Verify all environment variables for deployment');
    console.log('   • Run security audit: npm audit');

  } catch (error) {
    logError(`Build optimization failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Build optimization interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Build optimization terminated');
  process.exit(1);
});

// Run the optimization
if (require.main === module) {
  main();
}

module.exports = { main, config };