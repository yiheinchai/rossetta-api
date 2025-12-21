/**
 * Tests for @rossetta-api/tanstack-router
 * Note: These are basic structure tests. Full tests would require Tanstack Router environment.
 */

console.log('🧪 Testing Tanstack Router Package Structure...\n');

// Test 1: Check that module can be imported (syntax check)
console.log('Test 1: Module import check');
try {
  // We can't actually test router loaders without a router environment,
  // but we can verify the module structure is valid
  import('./index.js').then(module => {
    console.log('  ✅ Module imported successfully');
    
    // Check exports
    console.log('\nTest 2: Checking exports');
    const expectedExports = [
      'createRossettaRouterContext',
      'createRossettaLoader',
      'createRossettaLoaderWithDeps',
      'createRossettaMutation',
      'createRefetchableLoader',
      'createRouterContextWithRossetta',
      'useRossettaRouterClient',
      'useRossettaRequest'
    ];
    
    for (const exportName of expectedExports) {
      if (module[exportName]) {
        console.log(`  ✅ ${exportName} exported`);
      } else {
        console.error(`  ❌ ${exportName} not found`);
        process.exit(1);
      }
    }
    
    console.log('\n✅ All Tanstack Router package structure tests passed!');
    console.log('Note: Full loader tests require Tanstack Router environment');
  }).catch(error => {
    console.error('  ❌ Failed to import module:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('  ❌ Import error:', error);
  process.exit(1);
}
