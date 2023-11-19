export type Test<T> = {
    name: string,
    run: (prevState: T | undefined) => Promise<boolean | [boolean, T]>
}

export function createTestRunner<T>(test: Test<T>) {
    let prevValue: T | undefined = undefined
    return async (): Promise<boolean> => {
        const testResults = await test.run(prevValue)
        if (Array.isArray(testResults)) {
            prevValue = testResults[1]
            return testResults[0]
        } else {
            return testResults
        }
    }
}

export type SkippableResult = boolean | 'skipped'

export function createSkippableTestRunner<T>(test: Test<T>, sequentialFailureLimit?: number) {
    let sequentialFailures = 0
    const runner = createTestRunner(test)
    return async (): Promise<SkippableResult> => {
        if(sequentialFailures === (sequentialFailureLimit ?? 10)) return 'skipped'

        const passed = await runner()
        if(passed) {
            sequentialFailures = 0
        } else {
            sequentialFailures++
        }
        return passed
    }
}

export function iconForSkippableResult(result: SkippableResult): string {
    if(result === 'skipped') {
        return '-'
    } else if(result) {
        return '✅'
    } else {
        return '❌'
    }
}