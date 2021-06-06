test:
	deno test --import-map=import_map.json --no-check

test-watch:
	deno test --import-map=import_map.json --no-check --watch

coverage:
	deno test --import-map=import_map.json --no-check --coverage=cov_profile
	deno coverage cov_profile
	rm -rf cov_profile
