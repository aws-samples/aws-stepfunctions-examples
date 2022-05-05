find . -name package.json -not -path "*/node_modules/*" -not -path "*/cdk.out/*" -exec bash -c "npm --prefix \$(dirname {}) i" \;
npm run build