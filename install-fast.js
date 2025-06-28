const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Fast Installation...');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

// Step 1: Clean npm cache
log('\n🧹 Step 1: Cleaning npm cache', 'yellow');
if (!runCommand('npm cache clean --force', 'Cleaning npm cache')) {
  log('⚠️ Cache cleaning failed, but continuing...', 'yellow');
}

// Step 2: Remove existing node_modules and package-lock.json
log('\n🗑️ Step 2: Removing existing dependencies', 'yellow');
if (fs.existsSync('node_modules')) {
  runCommand('rmdir /s /q node_modules', 'Removing node_modules (Windows)');
}
if (fs.existsSync('package-lock.json')) {
  fs.unlinkSync('package-lock.json');
  log('✅ Removed package-lock.json', 'green');
}

// Step 3: Install dependencies with optimized settings
log('\n📦 Step 3: Installing dependencies', 'yellow');
const installCommands = [
  'npm install --no-optional --no-audit --no-fund --prefer-offline',
  'npm install --legacy-peer-deps --no-optional --no-audit --no-fund --prefer-offline',
  'npm install --force --no-optional --no-audit --no-fund --prefer-offline'
];

let installSuccess = false;
for (let i = 0; i < installCommands.length; i++) {
  log(`\n🔄 Attempt ${i + 1}/${installCommands.length}: ${installCommands[i]}`, 'blue');
  if (runCommand(installCommands[i], `Install attempt ${i + 1}`)) {
    installSuccess = true;
    break;
  }
  log('⏳ Waiting 5 seconds before next attempt...', 'yellow');
  setTimeout(() => {}, 5000);
}

if (installSuccess) {
  log('\n🎉 Installation completed successfully!', 'green');
  log('You can now run: npm run dev', 'blue');
} else {
  log('\n❌ All installation attempts failed', 'red');
  log('Try running: npm install --legacy-peer-deps manually', 'yellow');
}

// Step 4: Verify installation
if (installSuccess) {
  log('\n🔍 Step 4: Verifying installation', 'yellow');
  const requiredDirs = ['node_modules'];
  const requiredFiles = ['package-lock.json'];
  
  let allGood = true;
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      log(`❌ Missing: ${dir}`, 'red');
      allGood = false;
    }
  });
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      log(`❌ Missing: ${file}`, 'red');
      allGood = false;
    }
  });
  
  if (allGood) {
    log('✅ All required files and directories are present', 'green');
  }
} 