test:
	deno test --import-map=import_map.json --no-check

test-watch:
	deno test --import-map=import_map.json --no-check --watch

coverage:
	deno test --import-map=import_map.json --no-check --coverage=cov_profile
	deno coverage cov_profile
	rm -rf cov_profile

rule1: rule2
    @echo rule1

rule2:
    @echo rule2

.special: special_rule2_dont_parse
    @echo special

# The ":=" referenced in ticket 146 must not be a windows nmake thing,
# get 'invalid character '='' errors when uncommented.  but they are no
# longer parsed as tasks.
# VAR4:=foo
# VAR5 := foo
# else
# VAR4:=bar
# VAR5 := bar
