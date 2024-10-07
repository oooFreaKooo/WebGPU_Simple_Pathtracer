import eslintPluginTs from '@typescript-eslint/eslint-plugin'
import eslintParserTs from '@typescript-eslint/parser'

export default [
    {
        files: [ 'src/**/*.ts', 'src/**/*.js' ], // Apply to TypeScript and JavaScript files
        languageOptions: {
            ecmaVersion: 'latest',  // Enable the latest ECMAScript features
            sourceType: 'module',   // Use ES Modules
            parser: eslintParserTs, // Use TypeScript parser for both .ts and .js files
        },
        plugins: {
            '@typescript-eslint': eslintPluginTs, // Load TypeScript plugin
        },
        rules: {
            // General Best Practices
            'no-unused-vars': 'warn',                // Warn on unused variables
            'no-console': 'off',                     // Allow console statements
            'eqeqeq': [ 'error', 'always' ],           // Require strict equality `===`
            'curly': [ 'error', 'all' ],               // Require curly braces for all control structures
            'no-var': 'error',                       // Disallow `var`; use `let` or `const`
            'prefer-const': 'error',                 // Prefer `const` when variables are not reassigned

            // Code Formatting
            'semi': [ 'error', 'never' ],              // Disallow semicolons
            'indent': [ 'error', 4 ],                  // Use 4 spaces for indentation
            'quotes': [ 'error', 'single' ],           // Use single quotes for strings
            'object-curly-spacing': [ 'error', 'always' ], // Enforce space inside curly braces
            'array-bracket-spacing': [ 'error', 'always' ], // Enforce space inside array brackets
            'space-before-function-paren': [ 'error', 'always' ], // Require space before function parentheses

            // TypeScript-Specific Rules
            '@typescript-eslint/no-unused-vars': [ 'warn' ],  // TypeScript-specific unused variables rule
            '@typescript-eslint/no-explicit-any': 'off',    // Allow `any` type in TypeScript (can be adjusted as needed)
        },
    },
]
