declare module '@unitn-asa/pddl-client' {
    export function onlineSolver(pddlDomain: any, pddlProblem: any): any
    
    export class PddlExecutor {
        constructor(...actions: PddlAction[])
        exec(plan: any): Promise<void>
    }

    export class PddlProblem {
        constructor(name: string, objects: string, init: string[], goal: string)
        toPddlString(): string[] 
    }

    export class Beliefset {
        get objects(): string[]
        get entries(): [string, boolean] []

        addObject(obj: string): void 
        removeObject(obj: string): void
        declare(fact: string, value?: boolean): boolean
        undeclare(fact: string): boolean
        toPddlString(): string[]
        check(positive: boolean, fact: string): boolean
    }

    export class PddlDomain {
        constructor(name: string, ...actions: PddlAction[])
        toPddlString(): string
    }

    export class PddlAction {
        name: string
        parameters: string 
        precondition: string 
        effect: string 
        executor: (x: any) => any 

        constructor( name: string, parameters: string, precondition: string, effect: string, executor: any )
        toPddlString(): string
        static tokenize(literals: string): Tokens // TODO:
        static ground(tokenized: Tokens, parametersMap: Object): Tokens // TODO
        getGroundedTokenizedPrecondition(parameterValueMap: Object): Tokens 
        getGroundedTokenizedEffect(parameterValueMap: Object): Tokens  
    }
}

type Tokens = Array<Tokens> | Array<string>;
