import logger from './util/logger'
import delay from './util/delay'
import {Cookie, createCookieString, mergeCookies, parseCookieString, parseSetCookieString} from './util/cookies'
import Response = NodeJS.fetch.Response
import {createSkippableTestRunner, iconForSkippableResult, Test} from './util/testRunner'

const webReauthURL = 'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1'
const riotReauthURL = 'https://auth.riotgames.com/authorize?client_id=riot-client&response_type=id_token%20token&redirect_uri=http%3A%2F%2Flocalhost%2Fredirect&scope=read'

async function reauth(cookies: Cookie[], url: string) {
    const cookieStr = createCookieString(cookies)
    logger.verbose(`Reauthing with cookie string "${cookieStr}"`)
    const response = await fetch(url, {
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
    return response.headers.get('location')?.includes('access_token=') === true
}

function getRequiredEnvVar(name: string) {
    const value = process.env[name]
    if(value === undefined || value.length === 0) {
        logger.error(`Required environment variable "${name}" is not set!`)
        process.exit(1)
    }
    return value

}

async function main() {
    const initialWebCookieStr = getRequiredEnvVar('INITIAL_WEB_COOKIES')
    const initialRiotCookieStr = getRequiredEnvVar('INITIAL_RIOT_COOKIES')
    const initialRiotSecondaryCookieStr = getRequiredEnvVar('INITIAL_RIOT_SECONDARY_COOKIES')

    logger.verbose(`Starting web cookie string: "${initialWebCookieStr}"`)
    logger.verbose(`Starting riot cookie string: "${initialRiotCookieStr}"`)
    logger.verbose(`Starting riot secondary cookie string: "${initialRiotSecondaryCookieStr}"`)

    const initialWebCookies = parseCookieString(initialWebCookieStr)
    const initialRiotCookies = parseCookieString(initialRiotCookieStr)
    const initialRiotSecondaryCookies = parseCookieString(initialRiotSecondaryCookieStr)

    logger.verbose(`Parsed web initial cookies: ${JSON.stringify(initialWebCookies)}`)
    logger.verbose(`Parsed riot initial cookies: ${JSON.stringify(initialRiotCookies)}`)
    logger.verbose(`Parsed riot secondary initial cookies: ${JSON.stringify(initialRiotSecondaryCookies)}`)

    logger.info(`Loaded ${initialWebCookies.length} web cookie${initialWebCookies.length === 1 ? '' : 's'}`)
    logger.info(`Loaded ${initialRiotCookies.length} riot cookie${initialRiotCookies.length === 1 ? '' : 's'}`)
    logger.info(`Loaded ${initialRiotSecondaryCookies.length} riot secondary cookie${initialRiotSecondaryCookies.length === 1 ? '' : 's'}`)

    const tests: Test<any>[] = [
        // Original cookie reauths
        {
            name: 'Original Web Cookies - Web Reauth',
            run: async () => {
                return isReauthSuccessful(await reauth(initialWebCookies, webReauthURL))
            }
        },
        {
            name: 'Original Riot Cookies - Riot Reauth',
            run: async () => {
                return isReauthSuccessful(await reauth(initialRiotCookies, riotReauthURL))
            }
        },
        // Refreshed cookie reauths
        ...[
            {name: 'web', method: 'web', initial: initialWebCookies, url: webReauthURL},
            {name: 'riot', method: 'riot', initial: initialRiotCookies, url: riotReauthURL},
            {name: 'riot secondary', method: 'riot', initial: initialRiotCookies, url: riotReauthURL},
            {name: 'riot secondary', method: 'web', initial: initialRiotCookies, url: riotReauthURL}
        ].map(t => ({
            name: `Refreshed cookies - ${t.name} using ${t.method} reauth`,
            run: async (prevCookies: Cookie[] | undefined): Promise<[boolean, Cookie[]]> => {
                if(prevCookies !== undefined && prevCookies.length === 0) return [false, []]

                const cookies = prevCookies === undefined ? t.initial : prevCookies
                const response = await reauth(cookies, webReauthURL)
                const parsedCookies = parseSetCookieString(response.headers.get('set-cookie') ?? '')

                const success = isReauthSuccessful(response)
                return [success, success ? mergeCookies(cookies, parsedCookies) : cookies]
            }
        }))
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
                await delay(60_000)
            }
        }
        logger.info(`Results:\n${results.map(r => `\t${iconForSkippableResult(r.result)} - ${r.name}`).join('\n')}`)
    }

    setInterval(runTests, 15 * 60 * 1000)
    runTests()
}

main()