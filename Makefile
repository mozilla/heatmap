install:
	npm install

xpi: install
	jpm xpi

lint:
	node_modules/.bin/eslint 'lib/**' 'data/**'

run:
	JPM_FIREFOX_BINARY=/Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox jpm run

runtest:
	HEATMAP_TEST=1 JPM_FIREFOX_BINARY=/Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox jpm run

.PHONY = install
