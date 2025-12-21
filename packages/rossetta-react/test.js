/**
 * Tests for @rossetta-api/react
 * Note: These are basic structure tests. Full tests would require React testing library.
 */

console.log('🧪 Testing React Package Structure...\n');

// Test 1: Check that module can be imported (syntax check)
console.log('Test 1: Module import check');
try {
  // We can't actually test React hooks without a React environment,
  // but we can verify the module structure is valid
  import('./index.js').then(module => {
    console.log('  ✅ Module imported successfully');
    
    // Check exports
    console.log('\nTest 2: Checking exports');
    const expectedExports = [
      'RossettaProvider',
      'useRossetta',
      'useRossettaGet',
      'useRossettaPost',
      'useRossettaPut',
      'useRossettaDelete',
      'useRossettaMutation',
      'useRossettaQuery'
    ];
    
    for (const exportName of expectedExports) {
      if (module[exportName]) {
        console.log(`  ✅ ${exportName} exported`);
      } else {
        console.error(`  ❌ ${exportName} not found`);
        process.exit(1);
      }
    }
    
    console.log('\n✅ All React package structure tests passed!');
    console.log('Note: Full hook tests require React testing environment');
  }).catch(error => {
    console.error('  ❌ Failed to import module:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('  ❌ Import error:', error);
  process.exit(1);
}
