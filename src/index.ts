import logger from './util/logger'
import delay from './util/delay'
import {Cookie, createCookieString, mergeCookies, parseCookieString, parseSetCookieString} from './util/cookies'
import Response = NodeJS.fetch.Response
import {createSkippableTestRunner, iconForSkippableResult, Test} from './util/testRunner'

async function reauth(cookies: Cookie[]) {
    const cookieStr = createCookieString(cookies)
    logger.verbose(`Reauthing with cookie string "${cookieStr}"`)
    const response = await fetch('https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1', {
        method: 'GET',
        redirect: 'manual',
        headers: {
            'Cookie': cookieStr
        }
    })
    logger.verbose(`Response status: ${response.status} - ${response.statusText}`)
    logger.verbose(`Response headers: ${JSON.stringify([...response.headers.entries()])}`)
    return response
}

function isReauthSuccessful(response: Response) {
    return response.headers.get('location')?.startsWith('https://playvalorant.com/opt_in') === true
}

async function main() {
    const initialCookieStr = process.env['COOKIES']
    if(initialCookieStr === undefined || initialCookieStr.length === 0) {
        logger.error('Initial cookie string is not set!')
        process.exit(1)
    }
    logger.verbose(`Starting cookie string: "${initialCookieStr}"`)

    const initialCookies = parseCookieString(initialCookieStr)
    logger.verbose(`Parsed initial cookies: ${JSON.stringify(initialCookies)}`)
    logger.info(`Loaded ${initialCookies.length} cookie${initialCookies.length === 1 ? '' : 's'}`)

    const tests: Test<any>[] = [
        {
            name: 'Original Cookies',
            run: async () => {
                return isReauthSuccessful(await reauth(initialCookies))
            }
        },
        {
            name: 'Original SSID',
            run: async () => {
                return isReauthSuccessful(await reauth(initialCookies.filter(c => c.name === 'ssid')))
            }
        },
        {
            name: 'Refreshed SSID',
            run: async (prevSSID: string | undefined): Promise<[boolean, string]> => {
                if(prevSSID !== undefined && prevSSID.length === 0) return [false, '']

                const cookies = prevSSID === undefined ? initialCookies.filter(c => c.name === 'ssid') : [{name: 'ssid', value: prevSSID}]
                const response = await reauth(cookies)
                const parsedCookies = parseSetCookieString(response.headers.get('set-cookie') ?? '')
                const ssid = parsedCookies.find(c => c.name === 'ssid')?.value
                if(ssid === undefined || ssid.length === 0) {
                    logger.verbose('Invalid ssid from parsed cookies!')
                    return [false, '']
                }
                return [isReauthSuccessful(response), ssid]
            }
        },
        {
            name: 'Refreshed Cookies',
            run: async (prevCookies: Cookie[] | undefined): Promise<[boolean, Cookie[]]> => {
                if(prevCookies !== undefined && prevCookies.length === 0) return [false, []]

                const cookies = prevCookies === undefined ? initialCookies : prevCookies
                const response = await reauth(cookies)
                const parsedCookies = parseSetCookieString(response.headers.get('set-cookie') ?? '')

                return [isReauthSuccessful(response), mergeCookies(cookies, parsedCookies)]
            }
        }
    ]
    const runners = tests.map(t => ({name: t.name, run: createSkippableTestRunner(t)}))
    logger.info(`Initialized ${tests.length} tests`)

    const runTests = async () => {
        logger.info('Running tests!')

        const results: {name: string, result: Awaited<ReturnType<ReturnType<typeof createSkippableTestRunner>>>}[] = []
        for(const runner of runners) {
            logger.verbose(`Running "${runner.name}"`)
            const result = await runner.run()
            results.push({name: runner.name, result})
            logger.verbose(`${runner.name} result: ${result}`)

            if(result !== 'skipped') {
                await delay(10_000)
            }
        }
        logger.info(`Results:\n${results.map(r => `\t${iconForSkippableResult(r.result)} - ${r.name}`).join('\n')}`)
    }

    setInterval(runTests, 15 * 60 * 1000)
    runTests()
}

main()