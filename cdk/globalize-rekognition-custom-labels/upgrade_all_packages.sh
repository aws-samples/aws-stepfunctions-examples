npm install -g npm-check-updates
npm install -g aws-cdk@latest --force
find . -name package.json -not -path "*/node_modules/*" -not -path "*/cdk.out/*" -exec bash -c "ncu -u --packageFile {}" \;