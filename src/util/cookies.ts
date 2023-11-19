import setCookie from 'set-cookie-parser'

export type Cookie = {
    name: string
    value: string
}

export function createCookieString(cookies: Cookie[]) {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

export function parseSetCookieString(setCookieString: string): Cookie[] {
    return setCookie.parse(setCookie.splitCookiesString(setCookieString)).map(c => ({name: c.name, value: c.value}))
}

export function parseCookieString(cookieString: string): Cookie[] {
    return cookieString.split('; ').map(c => {
        const [name, ...rest] = c.split('=')
        return {
            name,
            value: rest.join('=')
        }
    })
}

/**
 * Merges two cookie arrays.
 * If both arrays contain the same cookie, the cookie from the 'a' list will be overwritten
 * @param a The base cookie array
 * @param b The additional cookie array
 */
export function mergeCookies(a: Cookie[], b: Cookie[]): Cookie[] {
    return [
        ...a.filter(ac => !b.some(bc => bc.name === ac.name)),
        ...b
    ]
}