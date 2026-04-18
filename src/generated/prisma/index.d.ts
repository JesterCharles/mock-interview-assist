
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model HealthCheck
 * 
 */
export type HealthCheck = $Result.DefaultSelection<Prisma.$HealthCheckPayload>
/**
 * Model Associate
 * 
 */
export type Associate = $Result.DefaultSelection<Prisma.$AssociatePayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model GapScore
 * 
 */
export type GapScore = $Result.DefaultSelection<Prisma.$GapScorePayload>
/**
 * Model Settings
 * 
 */
export type Settings = $Result.DefaultSelection<Prisma.$SettingsPayload>
/**
 * Model Cohort
 * 
 */
export type Cohort = $Result.DefaultSelection<Prisma.$CohortPayload>
/**
 * Model CurriculumWeek
 * 
 */
export type CurriculumWeek = $Result.DefaultSelection<Prisma.$CurriculumWeekPayload>
/**
 * Model Profile
 * 
 */
export type Profile = $Result.DefaultSelection<Prisma.$ProfilePayload>
/**
 * Model AuthEvent
 * 
 */
export type AuthEvent = $Result.DefaultSelection<Prisma.$AuthEventPayload>
/**
 * Model CodingChallenge
 * 
 */
export type CodingChallenge = $Result.DefaultSelection<Prisma.$CodingChallengePayload>
/**
 * Model CodingAttempt
 * 
 */
export type CodingAttempt = $Result.DefaultSelection<Prisma.$CodingAttemptPayload>
/**
 * Model CodingTestCase
 * 
 */
export type CodingTestCase = $Result.DefaultSelection<Prisma.$CodingTestCasePayload>
/**
 * Model CodingSkillSignal
 * 
 */
export type CodingSkillSignal = $Result.DefaultSelection<Prisma.$CodingSkillSignalPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more HealthChecks
 * const healthChecks = await prisma.healthCheck.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more HealthChecks
   * const healthChecks = await prisma.healthCheck.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.healthCheck`: Exposes CRUD operations for the **HealthCheck** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more HealthChecks
    * const healthChecks = await prisma.healthCheck.findMany()
    * ```
    */
  get healthCheck(): Prisma.HealthCheckDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.associate`: Exposes CRUD operations for the **Associate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Associates
    * const associates = await prisma.associate.findMany()
    * ```
    */
  get associate(): Prisma.AssociateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gapScore`: Exposes CRUD operations for the **GapScore** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GapScores
    * const gapScores = await prisma.gapScore.findMany()
    * ```
    */
  get gapScore(): Prisma.GapScoreDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.settings`: Exposes CRUD operations for the **Settings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Settings
    * const settings = await prisma.settings.findMany()
    * ```
    */
  get settings(): Prisma.SettingsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cohort`: Exposes CRUD operations for the **Cohort** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Cohorts
    * const cohorts = await prisma.cohort.findMany()
    * ```
    */
  get cohort(): Prisma.CohortDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.curriculumWeek`: Exposes CRUD operations for the **CurriculumWeek** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CurriculumWeeks
    * const curriculumWeeks = await prisma.curriculumWeek.findMany()
    * ```
    */
  get curriculumWeek(): Prisma.CurriculumWeekDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.profile`: Exposes CRUD operations for the **Profile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Profiles
    * const profiles = await prisma.profile.findMany()
    * ```
    */
  get profile(): Prisma.ProfileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.authEvent`: Exposes CRUD operations for the **AuthEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuthEvents
    * const authEvents = await prisma.authEvent.findMany()
    * ```
    */
  get authEvent(): Prisma.AuthEventDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.codingChallenge`: Exposes CRUD operations for the **CodingChallenge** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CodingChallenges
    * const codingChallenges = await prisma.codingChallenge.findMany()
    * ```
    */
  get codingChallenge(): Prisma.CodingChallengeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.codingAttempt`: Exposes CRUD operations for the **CodingAttempt** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CodingAttempts
    * const codingAttempts = await prisma.codingAttempt.findMany()
    * ```
    */
  get codingAttempt(): Prisma.CodingAttemptDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.codingTestCase`: Exposes CRUD operations for the **CodingTestCase** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CodingTestCases
    * const codingTestCases = await prisma.codingTestCase.findMany()
    * ```
    */
  get codingTestCase(): Prisma.CodingTestCaseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.codingSkillSignal`: Exposes CRUD operations for the **CodingSkillSignal** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CodingSkillSignals
    * const codingSkillSignals = await prisma.codingSkillSignal.findMany()
    * ```
    */
  get codingSkillSignal(): Prisma.CodingSkillSignalDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.7.0
   * Query Engine version: 75cbdc1eb7150937890ad5465d861175c6624711
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    HealthCheck: 'HealthCheck',
    Associate: 'Associate',
    Session: 'Session',
    GapScore: 'GapScore',
    Settings: 'Settings',
    Cohort: 'Cohort',
    CurriculumWeek: 'CurriculumWeek',
    Profile: 'Profile',
    AuthEvent: 'AuthEvent',
    CodingChallenge: 'CodingChallenge',
    CodingAttempt: 'CodingAttempt',
    CodingTestCase: 'CodingTestCase',
    CodingSkillSignal: 'CodingSkillSignal'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "healthCheck" | "associate" | "session" | "gapScore" | "settings" | "cohort" | "curriculumWeek" | "profile" | "authEvent" | "codingChallenge" | "codingAttempt" | "codingTestCase" | "codingSkillSignal"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      HealthCheck: {
        payload: Prisma.$HealthCheckPayload<ExtArgs>
        fields: Prisma.HealthCheckFieldRefs
        operations: {
          findUnique: {
            args: Prisma.HealthCheckFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.HealthCheckFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          findFirst: {
            args: Prisma.HealthCheckFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.HealthCheckFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          findMany: {
            args: Prisma.HealthCheckFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>[]
          }
          create: {
            args: Prisma.HealthCheckCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          createMany: {
            args: Prisma.HealthCheckCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.HealthCheckCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>[]
          }
          delete: {
            args: Prisma.HealthCheckDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          update: {
            args: Prisma.HealthCheckUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          deleteMany: {
            args: Prisma.HealthCheckDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.HealthCheckUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.HealthCheckUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>[]
          }
          upsert: {
            args: Prisma.HealthCheckUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HealthCheckPayload>
          }
          aggregate: {
            args: Prisma.HealthCheckAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateHealthCheck>
          }
          groupBy: {
            args: Prisma.HealthCheckGroupByArgs<ExtArgs>
            result: $Utils.Optional<HealthCheckGroupByOutputType>[]
          }
          count: {
            args: Prisma.HealthCheckCountArgs<ExtArgs>
            result: $Utils.Optional<HealthCheckCountAggregateOutputType> | number
          }
        }
      }
      Associate: {
        payload: Prisma.$AssociatePayload<ExtArgs>
        fields: Prisma.AssociateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AssociateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AssociateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          findFirst: {
            args: Prisma.AssociateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AssociateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          findMany: {
            args: Prisma.AssociateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>[]
          }
          create: {
            args: Prisma.AssociateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          createMany: {
            args: Prisma.AssociateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AssociateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>[]
          }
          delete: {
            args: Prisma.AssociateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          update: {
            args: Prisma.AssociateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          deleteMany: {
            args: Prisma.AssociateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AssociateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AssociateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>[]
          }
          upsert: {
            args: Prisma.AssociateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AssociatePayload>
          }
          aggregate: {
            args: Prisma.AssociateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAssociate>
          }
          groupBy: {
            args: Prisma.AssociateGroupByArgs<ExtArgs>
            result: $Utils.Optional<AssociateGroupByOutputType>[]
          }
          count: {
            args: Prisma.AssociateCountArgs<ExtArgs>
            result: $Utils.Optional<AssociateCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      GapScore: {
        payload: Prisma.$GapScorePayload<ExtArgs>
        fields: Prisma.GapScoreFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GapScoreFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GapScoreFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          findFirst: {
            args: Prisma.GapScoreFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GapScoreFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          findMany: {
            args: Prisma.GapScoreFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>[]
          }
          create: {
            args: Prisma.GapScoreCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          createMany: {
            args: Prisma.GapScoreCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GapScoreCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>[]
          }
          delete: {
            args: Prisma.GapScoreDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          update: {
            args: Prisma.GapScoreUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          deleteMany: {
            args: Prisma.GapScoreDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GapScoreUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GapScoreUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>[]
          }
          upsert: {
            args: Prisma.GapScoreUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$GapScorePayload>
          }
          aggregate: {
            args: Prisma.GapScoreAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGapScore>
          }
          groupBy: {
            args: Prisma.GapScoreGroupByArgs<ExtArgs>
            result: $Utils.Optional<GapScoreGroupByOutputType>[]
          }
          count: {
            args: Prisma.GapScoreCountArgs<ExtArgs>
            result: $Utils.Optional<GapScoreCountAggregateOutputType> | number
          }
        }
      }
      Settings: {
        payload: Prisma.$SettingsPayload<ExtArgs>
        fields: Prisma.SettingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SettingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SettingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          findFirst: {
            args: Prisma.SettingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SettingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          findMany: {
            args: Prisma.SettingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>[]
          }
          create: {
            args: Prisma.SettingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          createMany: {
            args: Prisma.SettingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SettingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>[]
          }
          delete: {
            args: Prisma.SettingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          update: {
            args: Prisma.SettingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          deleteMany: {
            args: Prisma.SettingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SettingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SettingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>[]
          }
          upsert: {
            args: Prisma.SettingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingsPayload>
          }
          aggregate: {
            args: Prisma.SettingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSettings>
          }
          groupBy: {
            args: Prisma.SettingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<SettingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.SettingsCountArgs<ExtArgs>
            result: $Utils.Optional<SettingsCountAggregateOutputType> | number
          }
        }
      }
      Cohort: {
        payload: Prisma.$CohortPayload<ExtArgs>
        fields: Prisma.CohortFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CohortFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CohortFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          findFirst: {
            args: Prisma.CohortFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CohortFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          findMany: {
            args: Prisma.CohortFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>[]
          }
          create: {
            args: Prisma.CohortCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          createMany: {
            args: Prisma.CohortCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CohortCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>[]
          }
          delete: {
            args: Prisma.CohortDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          update: {
            args: Prisma.CohortUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          deleteMany: {
            args: Prisma.CohortDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CohortUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CohortUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>[]
          }
          upsert: {
            args: Prisma.CohortUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CohortPayload>
          }
          aggregate: {
            args: Prisma.CohortAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCohort>
          }
          groupBy: {
            args: Prisma.CohortGroupByArgs<ExtArgs>
            result: $Utils.Optional<CohortGroupByOutputType>[]
          }
          count: {
            args: Prisma.CohortCountArgs<ExtArgs>
            result: $Utils.Optional<CohortCountAggregateOutputType> | number
          }
        }
      }
      CurriculumWeek: {
        payload: Prisma.$CurriculumWeekPayload<ExtArgs>
        fields: Prisma.CurriculumWeekFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CurriculumWeekFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CurriculumWeekFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          findFirst: {
            args: Prisma.CurriculumWeekFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CurriculumWeekFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          findMany: {
            args: Prisma.CurriculumWeekFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>[]
          }
          create: {
            args: Prisma.CurriculumWeekCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          createMany: {
            args: Prisma.CurriculumWeekCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CurriculumWeekCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>[]
          }
          delete: {
            args: Prisma.CurriculumWeekDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          update: {
            args: Prisma.CurriculumWeekUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          deleteMany: {
            args: Prisma.CurriculumWeekDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CurriculumWeekUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CurriculumWeekUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>[]
          }
          upsert: {
            args: Prisma.CurriculumWeekUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CurriculumWeekPayload>
          }
          aggregate: {
            args: Prisma.CurriculumWeekAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCurriculumWeek>
          }
          groupBy: {
            args: Prisma.CurriculumWeekGroupByArgs<ExtArgs>
            result: $Utils.Optional<CurriculumWeekGroupByOutputType>[]
          }
          count: {
            args: Prisma.CurriculumWeekCountArgs<ExtArgs>
            result: $Utils.Optional<CurriculumWeekCountAggregateOutputType> | number
          }
        }
      }
      Profile: {
        payload: Prisma.$ProfilePayload<ExtArgs>
        fields: Prisma.ProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          findFirst: {
            args: Prisma.ProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          findMany: {
            args: Prisma.ProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>[]
          }
          create: {
            args: Prisma.ProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          createMany: {
            args: Prisma.ProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>[]
          }
          delete: {
            args: Prisma.ProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          update: {
            args: Prisma.ProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          deleteMany: {
            args: Prisma.ProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProfileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>[]
          }
          upsert: {
            args: Prisma.ProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          aggregate: {
            args: Prisma.ProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProfile>
          }
          groupBy: {
            args: Prisma.ProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProfileCountArgs<ExtArgs>
            result: $Utils.Optional<ProfileCountAggregateOutputType> | number
          }
        }
      }
      AuthEvent: {
        payload: Prisma.$AuthEventPayload<ExtArgs>
        fields: Prisma.AuthEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuthEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuthEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          findFirst: {
            args: Prisma.AuthEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuthEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          findMany: {
            args: Prisma.AuthEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>[]
          }
          create: {
            args: Prisma.AuthEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          createMany: {
            args: Prisma.AuthEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuthEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>[]
          }
          delete: {
            args: Prisma.AuthEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          update: {
            args: Prisma.AuthEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          deleteMany: {
            args: Prisma.AuthEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuthEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuthEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>[]
          }
          upsert: {
            args: Prisma.AuthEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuthEventPayload>
          }
          aggregate: {
            args: Prisma.AuthEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuthEvent>
          }
          groupBy: {
            args: Prisma.AuthEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuthEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuthEventCountArgs<ExtArgs>
            result: $Utils.Optional<AuthEventCountAggregateOutputType> | number
          }
        }
      }
      CodingChallenge: {
        payload: Prisma.$CodingChallengePayload<ExtArgs>
        fields: Prisma.CodingChallengeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CodingChallengeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CodingChallengeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          findFirst: {
            args: Prisma.CodingChallengeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CodingChallengeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          findMany: {
            args: Prisma.CodingChallengeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>[]
          }
          create: {
            args: Prisma.CodingChallengeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          createMany: {
            args: Prisma.CodingChallengeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CodingChallengeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>[]
          }
          delete: {
            args: Prisma.CodingChallengeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          update: {
            args: Prisma.CodingChallengeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          deleteMany: {
            args: Prisma.CodingChallengeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CodingChallengeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CodingChallengeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>[]
          }
          upsert: {
            args: Prisma.CodingChallengeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingChallengePayload>
          }
          aggregate: {
            args: Prisma.CodingChallengeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCodingChallenge>
          }
          groupBy: {
            args: Prisma.CodingChallengeGroupByArgs<ExtArgs>
            result: $Utils.Optional<CodingChallengeGroupByOutputType>[]
          }
          count: {
            args: Prisma.CodingChallengeCountArgs<ExtArgs>
            result: $Utils.Optional<CodingChallengeCountAggregateOutputType> | number
          }
        }
      }
      CodingAttempt: {
        payload: Prisma.$CodingAttemptPayload<ExtArgs>
        fields: Prisma.CodingAttemptFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CodingAttemptFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CodingAttemptFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          findFirst: {
            args: Prisma.CodingAttemptFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CodingAttemptFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          findMany: {
            args: Prisma.CodingAttemptFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>[]
          }
          create: {
            args: Prisma.CodingAttemptCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          createMany: {
            args: Prisma.CodingAttemptCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CodingAttemptCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>[]
          }
          delete: {
            args: Prisma.CodingAttemptDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          update: {
            args: Prisma.CodingAttemptUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          deleteMany: {
            args: Prisma.CodingAttemptDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CodingAttemptUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CodingAttemptUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>[]
          }
          upsert: {
            args: Prisma.CodingAttemptUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingAttemptPayload>
          }
          aggregate: {
            args: Prisma.CodingAttemptAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCodingAttempt>
          }
          groupBy: {
            args: Prisma.CodingAttemptGroupByArgs<ExtArgs>
            result: $Utils.Optional<CodingAttemptGroupByOutputType>[]
          }
          count: {
            args: Prisma.CodingAttemptCountArgs<ExtArgs>
            result: $Utils.Optional<CodingAttemptCountAggregateOutputType> | number
          }
        }
      }
      CodingTestCase: {
        payload: Prisma.$CodingTestCasePayload<ExtArgs>
        fields: Prisma.CodingTestCaseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CodingTestCaseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CodingTestCaseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          findFirst: {
            args: Prisma.CodingTestCaseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CodingTestCaseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          findMany: {
            args: Prisma.CodingTestCaseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>[]
          }
          create: {
            args: Prisma.CodingTestCaseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          createMany: {
            args: Prisma.CodingTestCaseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CodingTestCaseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>[]
          }
          delete: {
            args: Prisma.CodingTestCaseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          update: {
            args: Prisma.CodingTestCaseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          deleteMany: {
            args: Prisma.CodingTestCaseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CodingTestCaseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CodingTestCaseUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>[]
          }
          upsert: {
            args: Prisma.CodingTestCaseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingTestCasePayload>
          }
          aggregate: {
            args: Prisma.CodingTestCaseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCodingTestCase>
          }
          groupBy: {
            args: Prisma.CodingTestCaseGroupByArgs<ExtArgs>
            result: $Utils.Optional<CodingTestCaseGroupByOutputType>[]
          }
          count: {
            args: Prisma.CodingTestCaseCountArgs<ExtArgs>
            result: $Utils.Optional<CodingTestCaseCountAggregateOutputType> | number
          }
        }
      }
      CodingSkillSignal: {
        payload: Prisma.$CodingSkillSignalPayload<ExtArgs>
        fields: Prisma.CodingSkillSignalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CodingSkillSignalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CodingSkillSignalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          findFirst: {
            args: Prisma.CodingSkillSignalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CodingSkillSignalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          findMany: {
            args: Prisma.CodingSkillSignalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>[]
          }
          create: {
            args: Prisma.CodingSkillSignalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          createMany: {
            args: Prisma.CodingSkillSignalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CodingSkillSignalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>[]
          }
          delete: {
            args: Prisma.CodingSkillSignalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          update: {
            args: Prisma.CodingSkillSignalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          deleteMany: {
            args: Prisma.CodingSkillSignalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CodingSkillSignalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CodingSkillSignalUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>[]
          }
          upsert: {
            args: Prisma.CodingSkillSignalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CodingSkillSignalPayload>
          }
          aggregate: {
            args: Prisma.CodingSkillSignalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCodingSkillSignal>
          }
          groupBy: {
            args: Prisma.CodingSkillSignalGroupByArgs<ExtArgs>
            result: $Utils.Optional<CodingSkillSignalGroupByOutputType>[]
          }
          count: {
            args: Prisma.CodingSkillSignalCountArgs<ExtArgs>
            result: $Utils.Optional<CodingSkillSignalCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    healthCheck?: HealthCheckOmit
    associate?: AssociateOmit
    session?: SessionOmit
    gapScore?: GapScoreOmit
    settings?: SettingsOmit
    cohort?: CohortOmit
    curriculumWeek?: CurriculumWeekOmit
    profile?: ProfileOmit
    authEvent?: AuthEventOmit
    codingChallenge?: CodingChallengeOmit
    codingAttempt?: CodingAttemptOmit
    codingTestCase?: CodingTestCaseOmit
    codingSkillSignal?: CodingSkillSignalOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type AssociateCountOutputType
   */

  export type AssociateCountOutputType = {
    sessions: number
    gapScores: number
    codingAttempts: number
  }

  export type AssociateCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | AssociateCountOutputTypeCountSessionsArgs
    gapScores?: boolean | AssociateCountOutputTypeCountGapScoresArgs
    codingAttempts?: boolean | AssociateCountOutputTypeCountCodingAttemptsArgs
  }

  // Custom InputTypes
  /**
   * AssociateCountOutputType without action
   */
  export type AssociateCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssociateCountOutputType
     */
    select?: AssociateCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AssociateCountOutputType without action
   */
  export type AssociateCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * AssociateCountOutputType without action
   */
  export type AssociateCountOutputTypeCountGapScoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GapScoreWhereInput
  }

  /**
   * AssociateCountOutputType without action
   */
  export type AssociateCountOutputTypeCountCodingAttemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingAttemptWhereInput
  }


  /**
   * Count Type CohortCountOutputType
   */

  export type CohortCountOutputType = {
    associates: number
    sessions: number
    curriculumWeeks: number
    codingChallenges: number
  }

  export type CohortCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associates?: boolean | CohortCountOutputTypeCountAssociatesArgs
    sessions?: boolean | CohortCountOutputTypeCountSessionsArgs
    curriculumWeeks?: boolean | CohortCountOutputTypeCountCurriculumWeeksArgs
    codingChallenges?: boolean | CohortCountOutputTypeCountCodingChallengesArgs
  }

  // Custom InputTypes
  /**
   * CohortCountOutputType without action
   */
  export type CohortCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CohortCountOutputType
     */
    select?: CohortCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CohortCountOutputType without action
   */
  export type CohortCountOutputTypeCountAssociatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AssociateWhereInput
  }

  /**
   * CohortCountOutputType without action
   */
  export type CohortCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * CohortCountOutputType without action
   */
  export type CohortCountOutputTypeCountCurriculumWeeksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CurriculumWeekWhereInput
  }

  /**
   * CohortCountOutputType without action
   */
  export type CohortCountOutputTypeCountCodingChallengesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingChallengeWhereInput
  }


  /**
   * Count Type CodingChallengeCountOutputType
   */

  export type CodingChallengeCountOutputType = {
    attempts: number
    testCases: number
  }

  export type CodingChallengeCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempts?: boolean | CodingChallengeCountOutputTypeCountAttemptsArgs
    testCases?: boolean | CodingChallengeCountOutputTypeCountTestCasesArgs
  }

  // Custom InputTypes
  /**
   * CodingChallengeCountOutputType without action
   */
  export type CodingChallengeCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallengeCountOutputType
     */
    select?: CodingChallengeCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CodingChallengeCountOutputType without action
   */
  export type CodingChallengeCountOutputTypeCountAttemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingAttemptWhereInput
  }

  /**
   * CodingChallengeCountOutputType without action
   */
  export type CodingChallengeCountOutputTypeCountTestCasesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingTestCaseWhereInput
  }


  /**
   * Models
   */

  /**
   * Model HealthCheck
   */

  export type AggregateHealthCheck = {
    _count: HealthCheckCountAggregateOutputType | null
    _avg: HealthCheckAvgAggregateOutputType | null
    _sum: HealthCheckSumAggregateOutputType | null
    _min: HealthCheckMinAggregateOutputType | null
    _max: HealthCheckMaxAggregateOutputType | null
  }

  export type HealthCheckAvgAggregateOutputType = {
    id: number | null
  }

  export type HealthCheckSumAggregateOutputType = {
    id: number | null
  }

  export type HealthCheckMinAggregateOutputType = {
    id: number | null
    createdAt: Date | null
  }

  export type HealthCheckMaxAggregateOutputType = {
    id: number | null
    createdAt: Date | null
  }

  export type HealthCheckCountAggregateOutputType = {
    id: number
    createdAt: number
    _all: number
  }


  export type HealthCheckAvgAggregateInputType = {
    id?: true
  }

  export type HealthCheckSumAggregateInputType = {
    id?: true
  }

  export type HealthCheckMinAggregateInputType = {
    id?: true
    createdAt?: true
  }

  export type HealthCheckMaxAggregateInputType = {
    id?: true
    createdAt?: true
  }

  export type HealthCheckCountAggregateInputType = {
    id?: true
    createdAt?: true
    _all?: true
  }

  export type HealthCheckAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which HealthCheck to aggregate.
     */
    where?: HealthCheckWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of HealthChecks to fetch.
     */
    orderBy?: HealthCheckOrderByWithRelationInput | HealthCheckOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: HealthCheckWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` HealthChecks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` HealthChecks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned HealthChecks
    **/
    _count?: true | HealthCheckCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: HealthCheckAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: HealthCheckSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: HealthCheckMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: HealthCheckMaxAggregateInputType
  }

  export type GetHealthCheckAggregateType<T extends HealthCheckAggregateArgs> = {
        [P in keyof T & keyof AggregateHealthCheck]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateHealthCheck[P]>
      : GetScalarType<T[P], AggregateHealthCheck[P]>
  }




  export type HealthCheckGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: HealthCheckWhereInput
    orderBy?: HealthCheckOrderByWithAggregationInput | HealthCheckOrderByWithAggregationInput[]
    by: HealthCheckScalarFieldEnum[] | HealthCheckScalarFieldEnum
    having?: HealthCheckScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: HealthCheckCountAggregateInputType | true
    _avg?: HealthCheckAvgAggregateInputType
    _sum?: HealthCheckSumAggregateInputType
    _min?: HealthCheckMinAggregateInputType
    _max?: HealthCheckMaxAggregateInputType
  }

  export type HealthCheckGroupByOutputType = {
    id: number
    createdAt: Date
    _count: HealthCheckCountAggregateOutputType | null
    _avg: HealthCheckAvgAggregateOutputType | null
    _sum: HealthCheckSumAggregateOutputType | null
    _min: HealthCheckMinAggregateOutputType | null
    _max: HealthCheckMaxAggregateOutputType | null
  }

  type GetHealthCheckGroupByPayload<T extends HealthCheckGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<HealthCheckGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof HealthCheckGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], HealthCheckGroupByOutputType[P]>
            : GetScalarType<T[P], HealthCheckGroupByOutputType[P]>
        }
      >
    >


  export type HealthCheckSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["healthCheck"]>

  export type HealthCheckSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["healthCheck"]>

  export type HealthCheckSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["healthCheck"]>

  export type HealthCheckSelectScalar = {
    id?: boolean
    createdAt?: boolean
  }

  export type HealthCheckOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "createdAt", ExtArgs["result"]["healthCheck"]>

  export type $HealthCheckPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "HealthCheck"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      createdAt: Date
    }, ExtArgs["result"]["healthCheck"]>
    composites: {}
  }

  type HealthCheckGetPayload<S extends boolean | null | undefined | HealthCheckDefaultArgs> = $Result.GetResult<Prisma.$HealthCheckPayload, S>

  type HealthCheckCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<HealthCheckFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: HealthCheckCountAggregateInputType | true
    }

  export interface HealthCheckDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['HealthCheck'], meta: { name: 'HealthCheck' } }
    /**
     * Find zero or one HealthCheck that matches the filter.
     * @param {HealthCheckFindUniqueArgs} args - Arguments to find a HealthCheck
     * @example
     * // Get one HealthCheck
     * const healthCheck = await prisma.healthCheck.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends HealthCheckFindUniqueArgs>(args: SelectSubset<T, HealthCheckFindUniqueArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one HealthCheck that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {HealthCheckFindUniqueOrThrowArgs} args - Arguments to find a HealthCheck
     * @example
     * // Get one HealthCheck
     * const healthCheck = await prisma.healthCheck.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends HealthCheckFindUniqueOrThrowArgs>(args: SelectSubset<T, HealthCheckFindUniqueOrThrowArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first HealthCheck that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckFindFirstArgs} args - Arguments to find a HealthCheck
     * @example
     * // Get one HealthCheck
     * const healthCheck = await prisma.healthCheck.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends HealthCheckFindFirstArgs>(args?: SelectSubset<T, HealthCheckFindFirstArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first HealthCheck that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckFindFirstOrThrowArgs} args - Arguments to find a HealthCheck
     * @example
     * // Get one HealthCheck
     * const healthCheck = await prisma.healthCheck.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends HealthCheckFindFirstOrThrowArgs>(args?: SelectSubset<T, HealthCheckFindFirstOrThrowArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more HealthChecks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all HealthChecks
     * const healthChecks = await prisma.healthCheck.findMany()
     * 
     * // Get first 10 HealthChecks
     * const healthChecks = await prisma.healthCheck.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const healthCheckWithIdOnly = await prisma.healthCheck.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends HealthCheckFindManyArgs>(args?: SelectSubset<T, HealthCheckFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a HealthCheck.
     * @param {HealthCheckCreateArgs} args - Arguments to create a HealthCheck.
     * @example
     * // Create one HealthCheck
     * const HealthCheck = await prisma.healthCheck.create({
     *   data: {
     *     // ... data to create a HealthCheck
     *   }
     * })
     * 
     */
    create<T extends HealthCheckCreateArgs>(args: SelectSubset<T, HealthCheckCreateArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many HealthChecks.
     * @param {HealthCheckCreateManyArgs} args - Arguments to create many HealthChecks.
     * @example
     * // Create many HealthChecks
     * const healthCheck = await prisma.healthCheck.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends HealthCheckCreateManyArgs>(args?: SelectSubset<T, HealthCheckCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many HealthChecks and returns the data saved in the database.
     * @param {HealthCheckCreateManyAndReturnArgs} args - Arguments to create many HealthChecks.
     * @example
     * // Create many HealthChecks
     * const healthCheck = await prisma.healthCheck.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many HealthChecks and only return the `id`
     * const healthCheckWithIdOnly = await prisma.healthCheck.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends HealthCheckCreateManyAndReturnArgs>(args?: SelectSubset<T, HealthCheckCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a HealthCheck.
     * @param {HealthCheckDeleteArgs} args - Arguments to delete one HealthCheck.
     * @example
     * // Delete one HealthCheck
     * const HealthCheck = await prisma.healthCheck.delete({
     *   where: {
     *     // ... filter to delete one HealthCheck
     *   }
     * })
     * 
     */
    delete<T extends HealthCheckDeleteArgs>(args: SelectSubset<T, HealthCheckDeleteArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one HealthCheck.
     * @param {HealthCheckUpdateArgs} args - Arguments to update one HealthCheck.
     * @example
     * // Update one HealthCheck
     * const healthCheck = await prisma.healthCheck.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends HealthCheckUpdateArgs>(args: SelectSubset<T, HealthCheckUpdateArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more HealthChecks.
     * @param {HealthCheckDeleteManyArgs} args - Arguments to filter HealthChecks to delete.
     * @example
     * // Delete a few HealthChecks
     * const { count } = await prisma.healthCheck.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends HealthCheckDeleteManyArgs>(args?: SelectSubset<T, HealthCheckDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more HealthChecks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many HealthChecks
     * const healthCheck = await prisma.healthCheck.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends HealthCheckUpdateManyArgs>(args: SelectSubset<T, HealthCheckUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more HealthChecks and returns the data updated in the database.
     * @param {HealthCheckUpdateManyAndReturnArgs} args - Arguments to update many HealthChecks.
     * @example
     * // Update many HealthChecks
     * const healthCheck = await prisma.healthCheck.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more HealthChecks and only return the `id`
     * const healthCheckWithIdOnly = await prisma.healthCheck.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends HealthCheckUpdateManyAndReturnArgs>(args: SelectSubset<T, HealthCheckUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one HealthCheck.
     * @param {HealthCheckUpsertArgs} args - Arguments to update or create a HealthCheck.
     * @example
     * // Update or create a HealthCheck
     * const healthCheck = await prisma.healthCheck.upsert({
     *   create: {
     *     // ... data to create a HealthCheck
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the HealthCheck we want to update
     *   }
     * })
     */
    upsert<T extends HealthCheckUpsertArgs>(args: SelectSubset<T, HealthCheckUpsertArgs<ExtArgs>>): Prisma__HealthCheckClient<$Result.GetResult<Prisma.$HealthCheckPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of HealthChecks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckCountArgs} args - Arguments to filter HealthChecks to count.
     * @example
     * // Count the number of HealthChecks
     * const count = await prisma.healthCheck.count({
     *   where: {
     *     // ... the filter for the HealthChecks we want to count
     *   }
     * })
    **/
    count<T extends HealthCheckCountArgs>(
      args?: Subset<T, HealthCheckCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], HealthCheckCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a HealthCheck.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends HealthCheckAggregateArgs>(args: Subset<T, HealthCheckAggregateArgs>): Prisma.PrismaPromise<GetHealthCheckAggregateType<T>>

    /**
     * Group by HealthCheck.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HealthCheckGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends HealthCheckGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: HealthCheckGroupByArgs['orderBy'] }
        : { orderBy?: HealthCheckGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, HealthCheckGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetHealthCheckGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the HealthCheck model
   */
  readonly fields: HealthCheckFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for HealthCheck.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__HealthCheckClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the HealthCheck model
   */
  interface HealthCheckFieldRefs {
    readonly id: FieldRef<"HealthCheck", 'Int'>
    readonly createdAt: FieldRef<"HealthCheck", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * HealthCheck findUnique
   */
  export type HealthCheckFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter, which HealthCheck to fetch.
     */
    where: HealthCheckWhereUniqueInput
  }

  /**
   * HealthCheck findUniqueOrThrow
   */
  export type HealthCheckFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter, which HealthCheck to fetch.
     */
    where: HealthCheckWhereUniqueInput
  }

  /**
   * HealthCheck findFirst
   */
  export type HealthCheckFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter, which HealthCheck to fetch.
     */
    where?: HealthCheckWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of HealthChecks to fetch.
     */
    orderBy?: HealthCheckOrderByWithRelationInput | HealthCheckOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for HealthChecks.
     */
    cursor?: HealthCheckWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` HealthChecks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` HealthChecks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of HealthChecks.
     */
    distinct?: HealthCheckScalarFieldEnum | HealthCheckScalarFieldEnum[]
  }

  /**
   * HealthCheck findFirstOrThrow
   */
  export type HealthCheckFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter, which HealthCheck to fetch.
     */
    where?: HealthCheckWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of HealthChecks to fetch.
     */
    orderBy?: HealthCheckOrderByWithRelationInput | HealthCheckOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for HealthChecks.
     */
    cursor?: HealthCheckWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` HealthChecks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` HealthChecks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of HealthChecks.
     */
    distinct?: HealthCheckScalarFieldEnum | HealthCheckScalarFieldEnum[]
  }

  /**
   * HealthCheck findMany
   */
  export type HealthCheckFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter, which HealthChecks to fetch.
     */
    where?: HealthCheckWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of HealthChecks to fetch.
     */
    orderBy?: HealthCheckOrderByWithRelationInput | HealthCheckOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing HealthChecks.
     */
    cursor?: HealthCheckWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` HealthChecks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` HealthChecks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of HealthChecks.
     */
    distinct?: HealthCheckScalarFieldEnum | HealthCheckScalarFieldEnum[]
  }

  /**
   * HealthCheck create
   */
  export type HealthCheckCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * The data needed to create a HealthCheck.
     */
    data?: XOR<HealthCheckCreateInput, HealthCheckUncheckedCreateInput>
  }

  /**
   * HealthCheck createMany
   */
  export type HealthCheckCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many HealthChecks.
     */
    data: HealthCheckCreateManyInput | HealthCheckCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * HealthCheck createManyAndReturn
   */
  export type HealthCheckCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * The data used to create many HealthChecks.
     */
    data: HealthCheckCreateManyInput | HealthCheckCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * HealthCheck update
   */
  export type HealthCheckUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * The data needed to update a HealthCheck.
     */
    data: XOR<HealthCheckUpdateInput, HealthCheckUncheckedUpdateInput>
    /**
     * Choose, which HealthCheck to update.
     */
    where: HealthCheckWhereUniqueInput
  }

  /**
   * HealthCheck updateMany
   */
  export type HealthCheckUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update HealthChecks.
     */
    data: XOR<HealthCheckUpdateManyMutationInput, HealthCheckUncheckedUpdateManyInput>
    /**
     * Filter which HealthChecks to update
     */
    where?: HealthCheckWhereInput
    /**
     * Limit how many HealthChecks to update.
     */
    limit?: number
  }

  /**
   * HealthCheck updateManyAndReturn
   */
  export type HealthCheckUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * The data used to update HealthChecks.
     */
    data: XOR<HealthCheckUpdateManyMutationInput, HealthCheckUncheckedUpdateManyInput>
    /**
     * Filter which HealthChecks to update
     */
    where?: HealthCheckWhereInput
    /**
     * Limit how many HealthChecks to update.
     */
    limit?: number
  }

  /**
   * HealthCheck upsert
   */
  export type HealthCheckUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * The filter to search for the HealthCheck to update in case it exists.
     */
    where: HealthCheckWhereUniqueInput
    /**
     * In case the HealthCheck found by the `where` argument doesn't exist, create a new HealthCheck with this data.
     */
    create: XOR<HealthCheckCreateInput, HealthCheckUncheckedCreateInput>
    /**
     * In case the HealthCheck was found with the provided `where` argument, update it with this data.
     */
    update: XOR<HealthCheckUpdateInput, HealthCheckUncheckedUpdateInput>
  }

  /**
   * HealthCheck delete
   */
  export type HealthCheckDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
    /**
     * Filter which HealthCheck to delete.
     */
    where: HealthCheckWhereUniqueInput
  }

  /**
   * HealthCheck deleteMany
   */
  export type HealthCheckDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which HealthChecks to delete
     */
    where?: HealthCheckWhereInput
    /**
     * Limit how many HealthChecks to delete.
     */
    limit?: number
  }

  /**
   * HealthCheck without action
   */
  export type HealthCheckDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HealthCheck
     */
    select?: HealthCheckSelect<ExtArgs> | null
    /**
     * Omit specific fields from the HealthCheck
     */
    omit?: HealthCheckOmit<ExtArgs> | null
  }


  /**
   * Model Associate
   */

  export type AggregateAssociate = {
    _count: AssociateCountAggregateOutputType | null
    _avg: AssociateAvgAggregateOutputType | null
    _sum: AssociateSumAggregateOutputType | null
    _min: AssociateMinAggregateOutputType | null
    _max: AssociateMaxAggregateOutputType | null
  }

  export type AssociateAvgAggregateOutputType = {
    id: number | null
    cohortId: number | null
  }

  export type AssociateSumAggregateOutputType = {
    id: number | null
    cohortId: number | null
  }

  export type AssociateMinAggregateOutputType = {
    id: number | null
    slug: string | null
    displayName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    readinessStatus: string | null
    recommendedArea: string | null
    lastComputedAt: Date | null
    email: string | null
    authUserId: string | null
    lastInvitedAt: Date | null
    cohortId: number | null
  }

  export type AssociateMaxAggregateOutputType = {
    id: number | null
    slug: string | null
    displayName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    readinessStatus: string | null
    recommendedArea: string | null
    lastComputedAt: Date | null
    email: string | null
    authUserId: string | null
    lastInvitedAt: Date | null
    cohortId: number | null
  }

  export type AssociateCountAggregateOutputType = {
    id: number
    slug: number
    displayName: number
    createdAt: number
    updatedAt: number
    readinessStatus: number
    recommendedArea: number
    lastComputedAt: number
    email: number
    authUserId: number
    lastInvitedAt: number
    cohortId: number
    _all: number
  }


  export type AssociateAvgAggregateInputType = {
    id?: true
    cohortId?: true
  }

  export type AssociateSumAggregateInputType = {
    id?: true
    cohortId?: true
  }

  export type AssociateMinAggregateInputType = {
    id?: true
    slug?: true
    displayName?: true
    createdAt?: true
    updatedAt?: true
    readinessStatus?: true
    recommendedArea?: true
    lastComputedAt?: true
    email?: true
    authUserId?: true
    lastInvitedAt?: true
    cohortId?: true
  }

  export type AssociateMaxAggregateInputType = {
    id?: true
    slug?: true
    displayName?: true
    createdAt?: true
    updatedAt?: true
    readinessStatus?: true
    recommendedArea?: true
    lastComputedAt?: true
    email?: true
    authUserId?: true
    lastInvitedAt?: true
    cohortId?: true
  }

  export type AssociateCountAggregateInputType = {
    id?: true
    slug?: true
    displayName?: true
    createdAt?: true
    updatedAt?: true
    readinessStatus?: true
    recommendedArea?: true
    lastComputedAt?: true
    email?: true
    authUserId?: true
    lastInvitedAt?: true
    cohortId?: true
    _all?: true
  }

  export type AssociateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Associate to aggregate.
     */
    where?: AssociateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Associates to fetch.
     */
    orderBy?: AssociateOrderByWithRelationInput | AssociateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AssociateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Associates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Associates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Associates
    **/
    _count?: true | AssociateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AssociateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AssociateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AssociateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AssociateMaxAggregateInputType
  }

  export type GetAssociateAggregateType<T extends AssociateAggregateArgs> = {
        [P in keyof T & keyof AggregateAssociate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAssociate[P]>
      : GetScalarType<T[P], AggregateAssociate[P]>
  }




  export type AssociateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AssociateWhereInput
    orderBy?: AssociateOrderByWithAggregationInput | AssociateOrderByWithAggregationInput[]
    by: AssociateScalarFieldEnum[] | AssociateScalarFieldEnum
    having?: AssociateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AssociateCountAggregateInputType | true
    _avg?: AssociateAvgAggregateInputType
    _sum?: AssociateSumAggregateInputType
    _min?: AssociateMinAggregateInputType
    _max?: AssociateMaxAggregateInputType
  }

  export type AssociateGroupByOutputType = {
    id: number
    slug: string
    displayName: string | null
    createdAt: Date
    updatedAt: Date
    readinessStatus: string | null
    recommendedArea: string | null
    lastComputedAt: Date | null
    email: string | null
    authUserId: string | null
    lastInvitedAt: Date | null
    cohortId: number | null
    _count: AssociateCountAggregateOutputType | null
    _avg: AssociateAvgAggregateOutputType | null
    _sum: AssociateSumAggregateOutputType | null
    _min: AssociateMinAggregateOutputType | null
    _max: AssociateMaxAggregateOutputType | null
  }

  type GetAssociateGroupByPayload<T extends AssociateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AssociateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AssociateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AssociateGroupByOutputType[P]>
            : GetScalarType<T[P], AssociateGroupByOutputType[P]>
        }
      >
    >


  export type AssociateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    displayName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    readinessStatus?: boolean
    recommendedArea?: boolean
    lastComputedAt?: boolean
    email?: boolean
    authUserId?: boolean
    lastInvitedAt?: boolean
    cohortId?: boolean
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
    sessions?: boolean | Associate$sessionsArgs<ExtArgs>
    gapScores?: boolean | Associate$gapScoresArgs<ExtArgs>
    codingAttempts?: boolean | Associate$codingAttemptsArgs<ExtArgs>
    _count?: boolean | AssociateCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["associate"]>

  export type AssociateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    displayName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    readinessStatus?: boolean
    recommendedArea?: boolean
    lastComputedAt?: boolean
    email?: boolean
    authUserId?: boolean
    lastInvitedAt?: boolean
    cohortId?: boolean
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["associate"]>

  export type AssociateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    displayName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    readinessStatus?: boolean
    recommendedArea?: boolean
    lastComputedAt?: boolean
    email?: boolean
    authUserId?: boolean
    lastInvitedAt?: boolean
    cohortId?: boolean
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["associate"]>

  export type AssociateSelectScalar = {
    id?: boolean
    slug?: boolean
    displayName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    readinessStatus?: boolean
    recommendedArea?: boolean
    lastComputedAt?: boolean
    email?: boolean
    authUserId?: boolean
    lastInvitedAt?: boolean
    cohortId?: boolean
  }

  export type AssociateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "displayName" | "createdAt" | "updatedAt" | "readinessStatus" | "recommendedArea" | "lastComputedAt" | "email" | "authUserId" | "lastInvitedAt" | "cohortId", ExtArgs["result"]["associate"]>
  export type AssociateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
    sessions?: boolean | Associate$sessionsArgs<ExtArgs>
    gapScores?: boolean | Associate$gapScoresArgs<ExtArgs>
    codingAttempts?: boolean | Associate$codingAttemptsArgs<ExtArgs>
    _count?: boolean | AssociateCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AssociateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
  }
  export type AssociateIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | Associate$cohortArgs<ExtArgs>
  }

  export type $AssociatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Associate"
    objects: {
      cohort: Prisma.$CohortPayload<ExtArgs> | null
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      gapScores: Prisma.$GapScorePayload<ExtArgs>[]
      codingAttempts: Prisma.$CodingAttemptPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      slug: string
      displayName: string | null
      createdAt: Date
      updatedAt: Date
      readinessStatus: string | null
      recommendedArea: string | null
      lastComputedAt: Date | null
      email: string | null
      authUserId: string | null
      lastInvitedAt: Date | null
      cohortId: number | null
    }, ExtArgs["result"]["associate"]>
    composites: {}
  }

  type AssociateGetPayload<S extends boolean | null | undefined | AssociateDefaultArgs> = $Result.GetResult<Prisma.$AssociatePayload, S>

  type AssociateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AssociateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AssociateCountAggregateInputType | true
    }

  export interface AssociateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Associate'], meta: { name: 'Associate' } }
    /**
     * Find zero or one Associate that matches the filter.
     * @param {AssociateFindUniqueArgs} args - Arguments to find a Associate
     * @example
     * // Get one Associate
     * const associate = await prisma.associate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AssociateFindUniqueArgs>(args: SelectSubset<T, AssociateFindUniqueArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Associate that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AssociateFindUniqueOrThrowArgs} args - Arguments to find a Associate
     * @example
     * // Get one Associate
     * const associate = await prisma.associate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AssociateFindUniqueOrThrowArgs>(args: SelectSubset<T, AssociateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Associate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateFindFirstArgs} args - Arguments to find a Associate
     * @example
     * // Get one Associate
     * const associate = await prisma.associate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AssociateFindFirstArgs>(args?: SelectSubset<T, AssociateFindFirstArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Associate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateFindFirstOrThrowArgs} args - Arguments to find a Associate
     * @example
     * // Get one Associate
     * const associate = await prisma.associate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AssociateFindFirstOrThrowArgs>(args?: SelectSubset<T, AssociateFindFirstOrThrowArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Associates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Associates
     * const associates = await prisma.associate.findMany()
     * 
     * // Get first 10 Associates
     * const associates = await prisma.associate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const associateWithIdOnly = await prisma.associate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AssociateFindManyArgs>(args?: SelectSubset<T, AssociateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Associate.
     * @param {AssociateCreateArgs} args - Arguments to create a Associate.
     * @example
     * // Create one Associate
     * const Associate = await prisma.associate.create({
     *   data: {
     *     // ... data to create a Associate
     *   }
     * })
     * 
     */
    create<T extends AssociateCreateArgs>(args: SelectSubset<T, AssociateCreateArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Associates.
     * @param {AssociateCreateManyArgs} args - Arguments to create many Associates.
     * @example
     * // Create many Associates
     * const associate = await prisma.associate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AssociateCreateManyArgs>(args?: SelectSubset<T, AssociateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Associates and returns the data saved in the database.
     * @param {AssociateCreateManyAndReturnArgs} args - Arguments to create many Associates.
     * @example
     * // Create many Associates
     * const associate = await prisma.associate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Associates and only return the `id`
     * const associateWithIdOnly = await prisma.associate.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AssociateCreateManyAndReturnArgs>(args?: SelectSubset<T, AssociateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Associate.
     * @param {AssociateDeleteArgs} args - Arguments to delete one Associate.
     * @example
     * // Delete one Associate
     * const Associate = await prisma.associate.delete({
     *   where: {
     *     // ... filter to delete one Associate
     *   }
     * })
     * 
     */
    delete<T extends AssociateDeleteArgs>(args: SelectSubset<T, AssociateDeleteArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Associate.
     * @param {AssociateUpdateArgs} args - Arguments to update one Associate.
     * @example
     * // Update one Associate
     * const associate = await prisma.associate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AssociateUpdateArgs>(args: SelectSubset<T, AssociateUpdateArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Associates.
     * @param {AssociateDeleteManyArgs} args - Arguments to filter Associates to delete.
     * @example
     * // Delete a few Associates
     * const { count } = await prisma.associate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AssociateDeleteManyArgs>(args?: SelectSubset<T, AssociateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Associates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Associates
     * const associate = await prisma.associate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AssociateUpdateManyArgs>(args: SelectSubset<T, AssociateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Associates and returns the data updated in the database.
     * @param {AssociateUpdateManyAndReturnArgs} args - Arguments to update many Associates.
     * @example
     * // Update many Associates
     * const associate = await prisma.associate.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Associates and only return the `id`
     * const associateWithIdOnly = await prisma.associate.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AssociateUpdateManyAndReturnArgs>(args: SelectSubset<T, AssociateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Associate.
     * @param {AssociateUpsertArgs} args - Arguments to update or create a Associate.
     * @example
     * // Update or create a Associate
     * const associate = await prisma.associate.upsert({
     *   create: {
     *     // ... data to create a Associate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Associate we want to update
     *   }
     * })
     */
    upsert<T extends AssociateUpsertArgs>(args: SelectSubset<T, AssociateUpsertArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Associates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateCountArgs} args - Arguments to filter Associates to count.
     * @example
     * // Count the number of Associates
     * const count = await prisma.associate.count({
     *   where: {
     *     // ... the filter for the Associates we want to count
     *   }
     * })
    **/
    count<T extends AssociateCountArgs>(
      args?: Subset<T, AssociateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AssociateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Associate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AssociateAggregateArgs>(args: Subset<T, AssociateAggregateArgs>): Prisma.PrismaPromise<GetAssociateAggregateType<T>>

    /**
     * Group by Associate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssociateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AssociateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AssociateGroupByArgs['orderBy'] }
        : { orderBy?: AssociateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AssociateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAssociateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Associate model
   */
  readonly fields: AssociateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Associate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AssociateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cohort<T extends Associate$cohortArgs<ExtArgs> = {}>(args?: Subset<T, Associate$cohortArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    sessions<T extends Associate$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, Associate$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gapScores<T extends Associate$gapScoresArgs<ExtArgs> = {}>(args?: Subset<T, Associate$gapScoresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    codingAttempts<T extends Associate$codingAttemptsArgs<ExtArgs> = {}>(args?: Subset<T, Associate$codingAttemptsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Associate model
   */
  interface AssociateFieldRefs {
    readonly id: FieldRef<"Associate", 'Int'>
    readonly slug: FieldRef<"Associate", 'String'>
    readonly displayName: FieldRef<"Associate", 'String'>
    readonly createdAt: FieldRef<"Associate", 'DateTime'>
    readonly updatedAt: FieldRef<"Associate", 'DateTime'>
    readonly readinessStatus: FieldRef<"Associate", 'String'>
    readonly recommendedArea: FieldRef<"Associate", 'String'>
    readonly lastComputedAt: FieldRef<"Associate", 'DateTime'>
    readonly email: FieldRef<"Associate", 'String'>
    readonly authUserId: FieldRef<"Associate", 'String'>
    readonly lastInvitedAt: FieldRef<"Associate", 'DateTime'>
    readonly cohortId: FieldRef<"Associate", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * Associate findUnique
   */
  export type AssociateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter, which Associate to fetch.
     */
    where: AssociateWhereUniqueInput
  }

  /**
   * Associate findUniqueOrThrow
   */
  export type AssociateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter, which Associate to fetch.
     */
    where: AssociateWhereUniqueInput
  }

  /**
   * Associate findFirst
   */
  export type AssociateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter, which Associate to fetch.
     */
    where?: AssociateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Associates to fetch.
     */
    orderBy?: AssociateOrderByWithRelationInput | AssociateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Associates.
     */
    cursor?: AssociateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Associates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Associates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Associates.
     */
    distinct?: AssociateScalarFieldEnum | AssociateScalarFieldEnum[]
  }

  /**
   * Associate findFirstOrThrow
   */
  export type AssociateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter, which Associate to fetch.
     */
    where?: AssociateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Associates to fetch.
     */
    orderBy?: AssociateOrderByWithRelationInput | AssociateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Associates.
     */
    cursor?: AssociateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Associates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Associates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Associates.
     */
    distinct?: AssociateScalarFieldEnum | AssociateScalarFieldEnum[]
  }

  /**
   * Associate findMany
   */
  export type AssociateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter, which Associates to fetch.
     */
    where?: AssociateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Associates to fetch.
     */
    orderBy?: AssociateOrderByWithRelationInput | AssociateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Associates.
     */
    cursor?: AssociateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Associates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Associates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Associates.
     */
    distinct?: AssociateScalarFieldEnum | AssociateScalarFieldEnum[]
  }

  /**
   * Associate create
   */
  export type AssociateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * The data needed to create a Associate.
     */
    data: XOR<AssociateCreateInput, AssociateUncheckedCreateInput>
  }

  /**
   * Associate createMany
   */
  export type AssociateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Associates.
     */
    data: AssociateCreateManyInput | AssociateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Associate createManyAndReturn
   */
  export type AssociateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * The data used to create many Associates.
     */
    data: AssociateCreateManyInput | AssociateCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Associate update
   */
  export type AssociateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * The data needed to update a Associate.
     */
    data: XOR<AssociateUpdateInput, AssociateUncheckedUpdateInput>
    /**
     * Choose, which Associate to update.
     */
    where: AssociateWhereUniqueInput
  }

  /**
   * Associate updateMany
   */
  export type AssociateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Associates.
     */
    data: XOR<AssociateUpdateManyMutationInput, AssociateUncheckedUpdateManyInput>
    /**
     * Filter which Associates to update
     */
    where?: AssociateWhereInput
    /**
     * Limit how many Associates to update.
     */
    limit?: number
  }

  /**
   * Associate updateManyAndReturn
   */
  export type AssociateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * The data used to update Associates.
     */
    data: XOR<AssociateUpdateManyMutationInput, AssociateUncheckedUpdateManyInput>
    /**
     * Filter which Associates to update
     */
    where?: AssociateWhereInput
    /**
     * Limit how many Associates to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Associate upsert
   */
  export type AssociateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * The filter to search for the Associate to update in case it exists.
     */
    where: AssociateWhereUniqueInput
    /**
     * In case the Associate found by the `where` argument doesn't exist, create a new Associate with this data.
     */
    create: XOR<AssociateCreateInput, AssociateUncheckedCreateInput>
    /**
     * In case the Associate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AssociateUpdateInput, AssociateUncheckedUpdateInput>
  }

  /**
   * Associate delete
   */
  export type AssociateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    /**
     * Filter which Associate to delete.
     */
    where: AssociateWhereUniqueInput
  }

  /**
   * Associate deleteMany
   */
  export type AssociateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Associates to delete
     */
    where?: AssociateWhereInput
    /**
     * Limit how many Associates to delete.
     */
    limit?: number
  }

  /**
   * Associate.cohort
   */
  export type Associate$cohortArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    where?: CohortWhereInput
  }

  /**
   * Associate.sessions
   */
  export type Associate$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Associate.gapScores
   */
  export type Associate$gapScoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    where?: GapScoreWhereInput
    orderBy?: GapScoreOrderByWithRelationInput | GapScoreOrderByWithRelationInput[]
    cursor?: GapScoreWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GapScoreScalarFieldEnum | GapScoreScalarFieldEnum[]
  }

  /**
   * Associate.codingAttempts
   */
  export type Associate$codingAttemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    where?: CodingAttemptWhereInput
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    cursor?: CodingAttemptWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CodingAttemptScalarFieldEnum | CodingAttemptScalarFieldEnum[]
  }

  /**
   * Associate without action
   */
  export type AssociateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionAvgAggregateOutputType = {
    questionCount: number | null
    overallTechnicalScore: number | null
    overallSoftSkillScore: number | null
    associateId: number | null
    cohortId: number | null
    aiTrainerVariance: number | null
  }

  export type SessionSumAggregateOutputType = {
    questionCount: number | null
    overallTechnicalScore: number | null
    overallSoftSkillScore: number | null
    associateId: number | null
    cohortId: number | null
    aiTrainerVariance: number | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    candidateName: string | null
    interviewerName: string | null
    date: string | null
    status: string | null
    questionCount: number | null
    overallTechnicalScore: number | null
    overallSoftSkillScore: number | null
    technicalFeedback: string | null
    softSkillFeedback: string | null
    associateId: number | null
    cohortId: number | null
    aiTrainerVariance: number | null
    mode: string | null
    readinessRecomputeStatus: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    candidateName: string | null
    interviewerName: string | null
    date: string | null
    status: string | null
    questionCount: number | null
    overallTechnicalScore: number | null
    overallSoftSkillScore: number | null
    technicalFeedback: string | null
    softSkillFeedback: string | null
    associateId: number | null
    cohortId: number | null
    aiTrainerVariance: number | null
    mode: string | null
    readinessRecomputeStatus: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    candidateName: number
    interviewerName: number
    date: number
    status: number
    questionCount: number
    selectedWeeks: number
    overallTechnicalScore: number
    overallSoftSkillScore: number
    technicalFeedback: number
    softSkillFeedback: number
    questions: number
    starterQuestions: number
    assessments: number
    techMap: number
    associateId: number
    cohortId: number
    aiTrainerVariance: number
    mode: number
    readinessRecomputeStatus: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SessionAvgAggregateInputType = {
    questionCount?: true
    overallTechnicalScore?: true
    overallSoftSkillScore?: true
    associateId?: true
    cohortId?: true
    aiTrainerVariance?: true
  }

  export type SessionSumAggregateInputType = {
    questionCount?: true
    overallTechnicalScore?: true
    overallSoftSkillScore?: true
    associateId?: true
    cohortId?: true
    aiTrainerVariance?: true
  }

  export type SessionMinAggregateInputType = {
    id?: true
    candidateName?: true
    interviewerName?: true
    date?: true
    status?: true
    questionCount?: true
    overallTechnicalScore?: true
    overallSoftSkillScore?: true
    technicalFeedback?: true
    softSkillFeedback?: true
    associateId?: true
    cohortId?: true
    aiTrainerVariance?: true
    mode?: true
    readinessRecomputeStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    candidateName?: true
    interviewerName?: true
    date?: true
    status?: true
    questionCount?: true
    overallTechnicalScore?: true
    overallSoftSkillScore?: true
    technicalFeedback?: true
    softSkillFeedback?: true
    associateId?: true
    cohortId?: true
    aiTrainerVariance?: true
    mode?: true
    readinessRecomputeStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    candidateName?: true
    interviewerName?: true
    date?: true
    status?: true
    questionCount?: true
    selectedWeeks?: true
    overallTechnicalScore?: true
    overallSoftSkillScore?: true
    technicalFeedback?: true
    softSkillFeedback?: true
    questions?: true
    starterQuestions?: true
    assessments?: true
    techMap?: true
    associateId?: true
    cohortId?: true
    aiTrainerVariance?: true
    mode?: true
    readinessRecomputeStatus?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _avg?: SessionAvgAggregateInputType
    _sum?: SessionSumAggregateInputType
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    candidateName: string | null
    interviewerName: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonValue
    overallTechnicalScore: number | null
    overallSoftSkillScore: number | null
    technicalFeedback: string | null
    softSkillFeedback: string | null
    questions: JsonValue
    starterQuestions: JsonValue
    assessments: JsonValue
    techMap: JsonValue | null
    associateId: number | null
    cohortId: number | null
    aiTrainerVariance: number | null
    mode: string
    readinessRecomputeStatus: string
    createdAt: Date
    updatedAt: Date
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    candidateName?: boolean
    interviewerName?: boolean
    date?: boolean
    status?: boolean
    questionCount?: boolean
    selectedWeeks?: boolean
    overallTechnicalScore?: boolean
    overallSoftSkillScore?: boolean
    technicalFeedback?: boolean
    softSkillFeedback?: boolean
    questions?: boolean
    starterQuestions?: boolean
    assessments?: boolean
    techMap?: boolean
    associateId?: boolean
    cohortId?: boolean
    aiTrainerVariance?: boolean
    mode?: boolean
    readinessRecomputeStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    candidateName?: boolean
    interviewerName?: boolean
    date?: boolean
    status?: boolean
    questionCount?: boolean
    selectedWeeks?: boolean
    overallTechnicalScore?: boolean
    overallSoftSkillScore?: boolean
    technicalFeedback?: boolean
    softSkillFeedback?: boolean
    questions?: boolean
    starterQuestions?: boolean
    assessments?: boolean
    techMap?: boolean
    associateId?: boolean
    cohortId?: boolean
    aiTrainerVariance?: boolean
    mode?: boolean
    readinessRecomputeStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    candidateName?: boolean
    interviewerName?: boolean
    date?: boolean
    status?: boolean
    questionCount?: boolean
    selectedWeeks?: boolean
    overallTechnicalScore?: boolean
    overallSoftSkillScore?: boolean
    technicalFeedback?: boolean
    softSkillFeedback?: boolean
    questions?: boolean
    starterQuestions?: boolean
    assessments?: boolean
    techMap?: boolean
    associateId?: boolean
    cohortId?: boolean
    aiTrainerVariance?: boolean
    mode?: boolean
    readinessRecomputeStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    candidateName?: boolean
    interviewerName?: boolean
    date?: boolean
    status?: boolean
    questionCount?: boolean
    selectedWeeks?: boolean
    overallTechnicalScore?: boolean
    overallSoftSkillScore?: boolean
    technicalFeedback?: boolean
    softSkillFeedback?: boolean
    questions?: boolean
    starterQuestions?: boolean
    assessments?: boolean
    techMap?: boolean
    associateId?: boolean
    cohortId?: boolean
    aiTrainerVariance?: boolean
    mode?: boolean
    readinessRecomputeStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "candidateName" | "interviewerName" | "date" | "status" | "questionCount" | "selectedWeeks" | "overallTechnicalScore" | "overallSoftSkillScore" | "technicalFeedback" | "softSkillFeedback" | "questions" | "starterQuestions" | "assessments" | "techMap" | "associateId" | "cohortId" | "aiTrainerVariance" | "mode" | "readinessRecomputeStatus" | "createdAt" | "updatedAt", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }
  export type SessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | Session$associateArgs<ExtArgs>
    cohort?: boolean | Session$cohortArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      associate: Prisma.$AssociatePayload<ExtArgs> | null
      cohort: Prisma.$CohortPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      candidateName: string | null
      interviewerName: string | null
      date: string
      status: string
      questionCount: number
      selectedWeeks: Prisma.JsonValue
      overallTechnicalScore: number | null
      overallSoftSkillScore: number | null
      technicalFeedback: string | null
      softSkillFeedback: string | null
      questions: Prisma.JsonValue
      starterQuestions: Prisma.JsonValue
      assessments: Prisma.JsonValue
      techMap: Prisma.JsonValue | null
      associateId: number | null
      cohortId: number | null
      aiTrainerVariance: number | null
      mode: string
      readinessRecomputeStatus: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    associate<T extends Session$associateArgs<ExtArgs> = {}>(args?: Subset<T, Session$associateArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    cohort<T extends Session$cohortArgs<ExtArgs> = {}>(args?: Subset<T, Session$cohortArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly candidateName: FieldRef<"Session", 'String'>
    readonly interviewerName: FieldRef<"Session", 'String'>
    readonly date: FieldRef<"Session", 'String'>
    readonly status: FieldRef<"Session", 'String'>
    readonly questionCount: FieldRef<"Session", 'Int'>
    readonly selectedWeeks: FieldRef<"Session", 'Json'>
    readonly overallTechnicalScore: FieldRef<"Session", 'Float'>
    readonly overallSoftSkillScore: FieldRef<"Session", 'Float'>
    readonly technicalFeedback: FieldRef<"Session", 'String'>
    readonly softSkillFeedback: FieldRef<"Session", 'String'>
    readonly questions: FieldRef<"Session", 'Json'>
    readonly starterQuestions: FieldRef<"Session", 'Json'>
    readonly assessments: FieldRef<"Session", 'Json'>
    readonly techMap: FieldRef<"Session", 'Json'>
    readonly associateId: FieldRef<"Session", 'Int'>
    readonly cohortId: FieldRef<"Session", 'Int'>
    readonly aiTrainerVariance: FieldRef<"Session", 'Float'>
    readonly mode: FieldRef<"Session", 'String'>
    readonly readinessRecomputeStatus: FieldRef<"Session", 'String'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
    readonly updatedAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session.associate
   */
  export type Session$associateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    where?: AssociateWhereInput
  }

  /**
   * Session.cohort
   */
  export type Session$cohortArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    where?: CohortWhereInput
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model GapScore
   */

  export type AggregateGapScore = {
    _count: GapScoreCountAggregateOutputType | null
    _avg: GapScoreAvgAggregateOutputType | null
    _sum: GapScoreSumAggregateOutputType | null
    _min: GapScoreMinAggregateOutputType | null
    _max: GapScoreMaxAggregateOutputType | null
  }

  export type GapScoreAvgAggregateOutputType = {
    associateId: number | null
    weightedScore: number | null
    prevWeightedScore: number | null
    sessionCount: number | null
  }

  export type GapScoreSumAggregateOutputType = {
    associateId: number | null
    weightedScore: number | null
    prevWeightedScore: number | null
    sessionCount: number | null
  }

  export type GapScoreMinAggregateOutputType = {
    id: string | null
    associateId: number | null
    skill: string | null
    topic: string | null
    weightedScore: number | null
    prevWeightedScore: number | null
    sessionCount: number | null
    lastUpdated: Date | null
  }

  export type GapScoreMaxAggregateOutputType = {
    id: string | null
    associateId: number | null
    skill: string | null
    topic: string | null
    weightedScore: number | null
    prevWeightedScore: number | null
    sessionCount: number | null
    lastUpdated: Date | null
  }

  export type GapScoreCountAggregateOutputType = {
    id: number
    associateId: number
    skill: number
    topic: number
    weightedScore: number
    prevWeightedScore: number
    sessionCount: number
    lastUpdated: number
    _all: number
  }


  export type GapScoreAvgAggregateInputType = {
    associateId?: true
    weightedScore?: true
    prevWeightedScore?: true
    sessionCount?: true
  }

  export type GapScoreSumAggregateInputType = {
    associateId?: true
    weightedScore?: true
    prevWeightedScore?: true
    sessionCount?: true
  }

  export type GapScoreMinAggregateInputType = {
    id?: true
    associateId?: true
    skill?: true
    topic?: true
    weightedScore?: true
    prevWeightedScore?: true
    sessionCount?: true
    lastUpdated?: true
  }

  export type GapScoreMaxAggregateInputType = {
    id?: true
    associateId?: true
    skill?: true
    topic?: true
    weightedScore?: true
    prevWeightedScore?: true
    sessionCount?: true
    lastUpdated?: true
  }

  export type GapScoreCountAggregateInputType = {
    id?: true
    associateId?: true
    skill?: true
    topic?: true
    weightedScore?: true
    prevWeightedScore?: true
    sessionCount?: true
    lastUpdated?: true
    _all?: true
  }

  export type GapScoreAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GapScore to aggregate.
     */
    where?: GapScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GapScores to fetch.
     */
    orderBy?: GapScoreOrderByWithRelationInput | GapScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GapScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GapScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GapScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GapScores
    **/
    _count?: true | GapScoreCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GapScoreAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GapScoreSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GapScoreMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GapScoreMaxAggregateInputType
  }

  export type GetGapScoreAggregateType<T extends GapScoreAggregateArgs> = {
        [P in keyof T & keyof AggregateGapScore]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGapScore[P]>
      : GetScalarType<T[P], AggregateGapScore[P]>
  }




  export type GapScoreGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GapScoreWhereInput
    orderBy?: GapScoreOrderByWithAggregationInput | GapScoreOrderByWithAggregationInput[]
    by: GapScoreScalarFieldEnum[] | GapScoreScalarFieldEnum
    having?: GapScoreScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GapScoreCountAggregateInputType | true
    _avg?: GapScoreAvgAggregateInputType
    _sum?: GapScoreSumAggregateInputType
    _min?: GapScoreMinAggregateInputType
    _max?: GapScoreMaxAggregateInputType
  }

  export type GapScoreGroupByOutputType = {
    id: string
    associateId: number
    skill: string
    topic: string
    weightedScore: number
    prevWeightedScore: number | null
    sessionCount: number
    lastUpdated: Date
    _count: GapScoreCountAggregateOutputType | null
    _avg: GapScoreAvgAggregateOutputType | null
    _sum: GapScoreSumAggregateOutputType | null
    _min: GapScoreMinAggregateOutputType | null
    _max: GapScoreMaxAggregateOutputType | null
  }

  type GetGapScoreGroupByPayload<T extends GapScoreGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GapScoreGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GapScoreGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GapScoreGroupByOutputType[P]>
            : GetScalarType<T[P], GapScoreGroupByOutputType[P]>
        }
      >
    >


  export type GapScoreSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    skill?: boolean
    topic?: boolean
    weightedScore?: boolean
    prevWeightedScore?: boolean
    sessionCount?: boolean
    lastUpdated?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gapScore"]>

  export type GapScoreSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    skill?: boolean
    topic?: boolean
    weightedScore?: boolean
    prevWeightedScore?: boolean
    sessionCount?: boolean
    lastUpdated?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gapScore"]>

  export type GapScoreSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    skill?: boolean
    topic?: boolean
    weightedScore?: boolean
    prevWeightedScore?: boolean
    sessionCount?: boolean
    lastUpdated?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gapScore"]>

  export type GapScoreSelectScalar = {
    id?: boolean
    associateId?: boolean
    skill?: boolean
    topic?: boolean
    weightedScore?: boolean
    prevWeightedScore?: boolean
    sessionCount?: boolean
    lastUpdated?: boolean
  }

  export type GapScoreOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "associateId" | "skill" | "topic" | "weightedScore" | "prevWeightedScore" | "sessionCount" | "lastUpdated", ExtArgs["result"]["gapScore"]>
  export type GapScoreInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }
  export type GapScoreIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }
  export type GapScoreIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
  }

  export type $GapScorePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GapScore"
    objects: {
      associate: Prisma.$AssociatePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      associateId: number
      skill: string
      topic: string
      weightedScore: number
      prevWeightedScore: number | null
      sessionCount: number
      lastUpdated: Date
    }, ExtArgs["result"]["gapScore"]>
    composites: {}
  }

  type GapScoreGetPayload<S extends boolean | null | undefined | GapScoreDefaultArgs> = $Result.GetResult<Prisma.$GapScorePayload, S>

  type GapScoreCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<GapScoreFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GapScoreCountAggregateInputType | true
    }

  export interface GapScoreDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GapScore'], meta: { name: 'GapScore' } }
    /**
     * Find zero or one GapScore that matches the filter.
     * @param {GapScoreFindUniqueArgs} args - Arguments to find a GapScore
     * @example
     * // Get one GapScore
     * const gapScore = await prisma.gapScore.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GapScoreFindUniqueArgs>(args: SelectSubset<T, GapScoreFindUniqueArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GapScore that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GapScoreFindUniqueOrThrowArgs} args - Arguments to find a GapScore
     * @example
     * // Get one GapScore
     * const gapScore = await prisma.gapScore.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GapScoreFindUniqueOrThrowArgs>(args: SelectSubset<T, GapScoreFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GapScore that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreFindFirstArgs} args - Arguments to find a GapScore
     * @example
     * // Get one GapScore
     * const gapScore = await prisma.gapScore.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GapScoreFindFirstArgs>(args?: SelectSubset<T, GapScoreFindFirstArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GapScore that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreFindFirstOrThrowArgs} args - Arguments to find a GapScore
     * @example
     * // Get one GapScore
     * const gapScore = await prisma.gapScore.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GapScoreFindFirstOrThrowArgs>(args?: SelectSubset<T, GapScoreFindFirstOrThrowArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GapScores that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GapScores
     * const gapScores = await prisma.gapScore.findMany()
     * 
     * // Get first 10 GapScores
     * const gapScores = await prisma.gapScore.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gapScoreWithIdOnly = await prisma.gapScore.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GapScoreFindManyArgs>(args?: SelectSubset<T, GapScoreFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GapScore.
     * @param {GapScoreCreateArgs} args - Arguments to create a GapScore.
     * @example
     * // Create one GapScore
     * const GapScore = await prisma.gapScore.create({
     *   data: {
     *     // ... data to create a GapScore
     *   }
     * })
     * 
     */
    create<T extends GapScoreCreateArgs>(args: SelectSubset<T, GapScoreCreateArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GapScores.
     * @param {GapScoreCreateManyArgs} args - Arguments to create many GapScores.
     * @example
     * // Create many GapScores
     * const gapScore = await prisma.gapScore.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GapScoreCreateManyArgs>(args?: SelectSubset<T, GapScoreCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GapScores and returns the data saved in the database.
     * @param {GapScoreCreateManyAndReturnArgs} args - Arguments to create many GapScores.
     * @example
     * // Create many GapScores
     * const gapScore = await prisma.gapScore.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GapScores and only return the `id`
     * const gapScoreWithIdOnly = await prisma.gapScore.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GapScoreCreateManyAndReturnArgs>(args?: SelectSubset<T, GapScoreCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GapScore.
     * @param {GapScoreDeleteArgs} args - Arguments to delete one GapScore.
     * @example
     * // Delete one GapScore
     * const GapScore = await prisma.gapScore.delete({
     *   where: {
     *     // ... filter to delete one GapScore
     *   }
     * })
     * 
     */
    delete<T extends GapScoreDeleteArgs>(args: SelectSubset<T, GapScoreDeleteArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GapScore.
     * @param {GapScoreUpdateArgs} args - Arguments to update one GapScore.
     * @example
     * // Update one GapScore
     * const gapScore = await prisma.gapScore.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GapScoreUpdateArgs>(args: SelectSubset<T, GapScoreUpdateArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GapScores.
     * @param {GapScoreDeleteManyArgs} args - Arguments to filter GapScores to delete.
     * @example
     * // Delete a few GapScores
     * const { count } = await prisma.gapScore.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GapScoreDeleteManyArgs>(args?: SelectSubset<T, GapScoreDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GapScores.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GapScores
     * const gapScore = await prisma.gapScore.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GapScoreUpdateManyArgs>(args: SelectSubset<T, GapScoreUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GapScores and returns the data updated in the database.
     * @param {GapScoreUpdateManyAndReturnArgs} args - Arguments to update many GapScores.
     * @example
     * // Update many GapScores
     * const gapScore = await prisma.gapScore.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GapScores and only return the `id`
     * const gapScoreWithIdOnly = await prisma.gapScore.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GapScoreUpdateManyAndReturnArgs>(args: SelectSubset<T, GapScoreUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GapScore.
     * @param {GapScoreUpsertArgs} args - Arguments to update or create a GapScore.
     * @example
     * // Update or create a GapScore
     * const gapScore = await prisma.gapScore.upsert({
     *   create: {
     *     // ... data to create a GapScore
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GapScore we want to update
     *   }
     * })
     */
    upsert<T extends GapScoreUpsertArgs>(args: SelectSubset<T, GapScoreUpsertArgs<ExtArgs>>): Prisma__GapScoreClient<$Result.GetResult<Prisma.$GapScorePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GapScores.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreCountArgs} args - Arguments to filter GapScores to count.
     * @example
     * // Count the number of GapScores
     * const count = await prisma.gapScore.count({
     *   where: {
     *     // ... the filter for the GapScores we want to count
     *   }
     * })
    **/
    count<T extends GapScoreCountArgs>(
      args?: Subset<T, GapScoreCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GapScoreCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GapScore.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GapScoreAggregateArgs>(args: Subset<T, GapScoreAggregateArgs>): Prisma.PrismaPromise<GetGapScoreAggregateType<T>>

    /**
     * Group by GapScore.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GapScoreGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GapScoreGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GapScoreGroupByArgs['orderBy'] }
        : { orderBy?: GapScoreGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GapScoreGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGapScoreGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GapScore model
   */
  readonly fields: GapScoreFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GapScore.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GapScoreClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    associate<T extends AssociateDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AssociateDefaultArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the GapScore model
   */
  interface GapScoreFieldRefs {
    readonly id: FieldRef<"GapScore", 'String'>
    readonly associateId: FieldRef<"GapScore", 'Int'>
    readonly skill: FieldRef<"GapScore", 'String'>
    readonly topic: FieldRef<"GapScore", 'String'>
    readonly weightedScore: FieldRef<"GapScore", 'Float'>
    readonly prevWeightedScore: FieldRef<"GapScore", 'Float'>
    readonly sessionCount: FieldRef<"GapScore", 'Int'>
    readonly lastUpdated: FieldRef<"GapScore", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GapScore findUnique
   */
  export type GapScoreFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter, which GapScore to fetch.
     */
    where: GapScoreWhereUniqueInput
  }

  /**
   * GapScore findUniqueOrThrow
   */
  export type GapScoreFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter, which GapScore to fetch.
     */
    where: GapScoreWhereUniqueInput
  }

  /**
   * GapScore findFirst
   */
  export type GapScoreFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter, which GapScore to fetch.
     */
    where?: GapScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GapScores to fetch.
     */
    orderBy?: GapScoreOrderByWithRelationInput | GapScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GapScores.
     */
    cursor?: GapScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GapScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GapScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GapScores.
     */
    distinct?: GapScoreScalarFieldEnum | GapScoreScalarFieldEnum[]
  }

  /**
   * GapScore findFirstOrThrow
   */
  export type GapScoreFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter, which GapScore to fetch.
     */
    where?: GapScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GapScores to fetch.
     */
    orderBy?: GapScoreOrderByWithRelationInput | GapScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GapScores.
     */
    cursor?: GapScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GapScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GapScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GapScores.
     */
    distinct?: GapScoreScalarFieldEnum | GapScoreScalarFieldEnum[]
  }

  /**
   * GapScore findMany
   */
  export type GapScoreFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter, which GapScores to fetch.
     */
    where?: GapScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GapScores to fetch.
     */
    orderBy?: GapScoreOrderByWithRelationInput | GapScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GapScores.
     */
    cursor?: GapScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GapScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GapScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GapScores.
     */
    distinct?: GapScoreScalarFieldEnum | GapScoreScalarFieldEnum[]
  }

  /**
   * GapScore create
   */
  export type GapScoreCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * The data needed to create a GapScore.
     */
    data: XOR<GapScoreCreateInput, GapScoreUncheckedCreateInput>
  }

  /**
   * GapScore createMany
   */
  export type GapScoreCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GapScores.
     */
    data: GapScoreCreateManyInput | GapScoreCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GapScore createManyAndReturn
   */
  export type GapScoreCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * The data used to create many GapScores.
     */
    data: GapScoreCreateManyInput | GapScoreCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GapScore update
   */
  export type GapScoreUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * The data needed to update a GapScore.
     */
    data: XOR<GapScoreUpdateInput, GapScoreUncheckedUpdateInput>
    /**
     * Choose, which GapScore to update.
     */
    where: GapScoreWhereUniqueInput
  }

  /**
   * GapScore updateMany
   */
  export type GapScoreUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GapScores.
     */
    data: XOR<GapScoreUpdateManyMutationInput, GapScoreUncheckedUpdateManyInput>
    /**
     * Filter which GapScores to update
     */
    where?: GapScoreWhereInput
    /**
     * Limit how many GapScores to update.
     */
    limit?: number
  }

  /**
   * GapScore updateManyAndReturn
   */
  export type GapScoreUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * The data used to update GapScores.
     */
    data: XOR<GapScoreUpdateManyMutationInput, GapScoreUncheckedUpdateManyInput>
    /**
     * Filter which GapScores to update
     */
    where?: GapScoreWhereInput
    /**
     * Limit how many GapScores to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GapScore upsert
   */
  export type GapScoreUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * The filter to search for the GapScore to update in case it exists.
     */
    where: GapScoreWhereUniqueInput
    /**
     * In case the GapScore found by the `where` argument doesn't exist, create a new GapScore with this data.
     */
    create: XOR<GapScoreCreateInput, GapScoreUncheckedCreateInput>
    /**
     * In case the GapScore was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GapScoreUpdateInput, GapScoreUncheckedUpdateInput>
  }

  /**
   * GapScore delete
   */
  export type GapScoreDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
    /**
     * Filter which GapScore to delete.
     */
    where: GapScoreWhereUniqueInput
  }

  /**
   * GapScore deleteMany
   */
  export type GapScoreDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GapScores to delete
     */
    where?: GapScoreWhereInput
    /**
     * Limit how many GapScores to delete.
     */
    limit?: number
  }

  /**
   * GapScore without action
   */
  export type GapScoreDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GapScore
     */
    select?: GapScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GapScore
     */
    omit?: GapScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GapScoreInclude<ExtArgs> | null
  }


  /**
   * Model Settings
   */

  export type AggregateSettings = {
    _count: SettingsCountAggregateOutputType | null
    _avg: SettingsAvgAggregateOutputType | null
    _sum: SettingsSumAggregateOutputType | null
    _min: SettingsMinAggregateOutputType | null
    _max: SettingsMaxAggregateOutputType | null
  }

  export type SettingsAvgAggregateOutputType = {
    id: number | null
    readinessThreshold: number | null
  }

  export type SettingsSumAggregateOutputType = {
    id: number | null
    readinessThreshold: number | null
  }

  export type SettingsMinAggregateOutputType = {
    id: number | null
    readinessThreshold: number | null
    updatedAt: Date | null
  }

  export type SettingsMaxAggregateOutputType = {
    id: number | null
    readinessThreshold: number | null
    updatedAt: Date | null
  }

  export type SettingsCountAggregateOutputType = {
    id: number
    readinessThreshold: number
    updatedAt: number
    _all: number
  }


  export type SettingsAvgAggregateInputType = {
    id?: true
    readinessThreshold?: true
  }

  export type SettingsSumAggregateInputType = {
    id?: true
    readinessThreshold?: true
  }

  export type SettingsMinAggregateInputType = {
    id?: true
    readinessThreshold?: true
    updatedAt?: true
  }

  export type SettingsMaxAggregateInputType = {
    id?: true
    readinessThreshold?: true
    updatedAt?: true
  }

  export type SettingsCountAggregateInputType = {
    id?: true
    readinessThreshold?: true
    updatedAt?: true
    _all?: true
  }

  export type SettingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Settings to aggregate.
     */
    where?: SettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingsOrderByWithRelationInput | SettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Settings
    **/
    _count?: true | SettingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SettingsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SettingsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SettingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SettingsMaxAggregateInputType
  }

  export type GetSettingsAggregateType<T extends SettingsAggregateArgs> = {
        [P in keyof T & keyof AggregateSettings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSettings[P]>
      : GetScalarType<T[P], AggregateSettings[P]>
  }




  export type SettingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SettingsWhereInput
    orderBy?: SettingsOrderByWithAggregationInput | SettingsOrderByWithAggregationInput[]
    by: SettingsScalarFieldEnum[] | SettingsScalarFieldEnum
    having?: SettingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SettingsCountAggregateInputType | true
    _avg?: SettingsAvgAggregateInputType
    _sum?: SettingsSumAggregateInputType
    _min?: SettingsMinAggregateInputType
    _max?: SettingsMaxAggregateInputType
  }

  export type SettingsGroupByOutputType = {
    id: number
    readinessThreshold: number
    updatedAt: Date
    _count: SettingsCountAggregateOutputType | null
    _avg: SettingsAvgAggregateOutputType | null
    _sum: SettingsSumAggregateOutputType | null
    _min: SettingsMinAggregateOutputType | null
    _max: SettingsMaxAggregateOutputType | null
  }

  type GetSettingsGroupByPayload<T extends SettingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SettingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SettingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SettingsGroupByOutputType[P]>
            : GetScalarType<T[P], SettingsGroupByOutputType[P]>
        }
      >
    >


  export type SettingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    readinessThreshold?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["settings"]>

  export type SettingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    readinessThreshold?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["settings"]>

  export type SettingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    readinessThreshold?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["settings"]>

  export type SettingsSelectScalar = {
    id?: boolean
    readinessThreshold?: boolean
    updatedAt?: boolean
  }

  export type SettingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "readinessThreshold" | "updatedAt", ExtArgs["result"]["settings"]>

  export type $SettingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Settings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      readinessThreshold: number
      updatedAt: Date
    }, ExtArgs["result"]["settings"]>
    composites: {}
  }

  type SettingsGetPayload<S extends boolean | null | undefined | SettingsDefaultArgs> = $Result.GetResult<Prisma.$SettingsPayload, S>

  type SettingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SettingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SettingsCountAggregateInputType | true
    }

  export interface SettingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Settings'], meta: { name: 'Settings' } }
    /**
     * Find zero or one Settings that matches the filter.
     * @param {SettingsFindUniqueArgs} args - Arguments to find a Settings
     * @example
     * // Get one Settings
     * const settings = await prisma.settings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SettingsFindUniqueArgs>(args: SelectSubset<T, SettingsFindUniqueArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Settings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SettingsFindUniqueOrThrowArgs} args - Arguments to find a Settings
     * @example
     * // Get one Settings
     * const settings = await prisma.settings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SettingsFindUniqueOrThrowArgs>(args: SelectSubset<T, SettingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsFindFirstArgs} args - Arguments to find a Settings
     * @example
     * // Get one Settings
     * const settings = await prisma.settings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SettingsFindFirstArgs>(args?: SelectSubset<T, SettingsFindFirstArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Settings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsFindFirstOrThrowArgs} args - Arguments to find a Settings
     * @example
     * // Get one Settings
     * const settings = await prisma.settings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SettingsFindFirstOrThrowArgs>(args?: SelectSubset<T, SettingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Settings
     * const settings = await prisma.settings.findMany()
     * 
     * // Get first 10 Settings
     * const settings = await prisma.settings.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const settingsWithIdOnly = await prisma.settings.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SettingsFindManyArgs>(args?: SelectSubset<T, SettingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Settings.
     * @param {SettingsCreateArgs} args - Arguments to create a Settings.
     * @example
     * // Create one Settings
     * const Settings = await prisma.settings.create({
     *   data: {
     *     // ... data to create a Settings
     *   }
     * })
     * 
     */
    create<T extends SettingsCreateArgs>(args: SelectSubset<T, SettingsCreateArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Settings.
     * @param {SettingsCreateManyArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const settings = await prisma.settings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SettingsCreateManyArgs>(args?: SelectSubset<T, SettingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Settings and returns the data saved in the database.
     * @param {SettingsCreateManyAndReturnArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const settings = await prisma.settings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Settings and only return the `id`
     * const settingsWithIdOnly = await prisma.settings.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SettingsCreateManyAndReturnArgs>(args?: SelectSubset<T, SettingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Settings.
     * @param {SettingsDeleteArgs} args - Arguments to delete one Settings.
     * @example
     * // Delete one Settings
     * const Settings = await prisma.settings.delete({
     *   where: {
     *     // ... filter to delete one Settings
     *   }
     * })
     * 
     */
    delete<T extends SettingsDeleteArgs>(args: SelectSubset<T, SettingsDeleteArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Settings.
     * @param {SettingsUpdateArgs} args - Arguments to update one Settings.
     * @example
     * // Update one Settings
     * const settings = await prisma.settings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SettingsUpdateArgs>(args: SelectSubset<T, SettingsUpdateArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Settings.
     * @param {SettingsDeleteManyArgs} args - Arguments to filter Settings to delete.
     * @example
     * // Delete a few Settings
     * const { count } = await prisma.settings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SettingsDeleteManyArgs>(args?: SelectSubset<T, SettingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Settings
     * const settings = await prisma.settings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SettingsUpdateManyArgs>(args: SelectSubset<T, SettingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings and returns the data updated in the database.
     * @param {SettingsUpdateManyAndReturnArgs} args - Arguments to update many Settings.
     * @example
     * // Update many Settings
     * const settings = await prisma.settings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Settings and only return the `id`
     * const settingsWithIdOnly = await prisma.settings.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SettingsUpdateManyAndReturnArgs>(args: SelectSubset<T, SettingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Settings.
     * @param {SettingsUpsertArgs} args - Arguments to update or create a Settings.
     * @example
     * // Update or create a Settings
     * const settings = await prisma.settings.upsert({
     *   create: {
     *     // ... data to create a Settings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Settings we want to update
     *   }
     * })
     */
    upsert<T extends SettingsUpsertArgs>(args: SelectSubset<T, SettingsUpsertArgs<ExtArgs>>): Prisma__SettingsClient<$Result.GetResult<Prisma.$SettingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsCountArgs} args - Arguments to filter Settings to count.
     * @example
     * // Count the number of Settings
     * const count = await prisma.settings.count({
     *   where: {
     *     // ... the filter for the Settings we want to count
     *   }
     * })
    **/
    count<T extends SettingsCountArgs>(
      args?: Subset<T, SettingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SettingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SettingsAggregateArgs>(args: Subset<T, SettingsAggregateArgs>): Prisma.PrismaPromise<GetSettingsAggregateType<T>>

    /**
     * Group by Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SettingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SettingsGroupByArgs['orderBy'] }
        : { orderBy?: SettingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SettingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSettingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Settings model
   */
  readonly fields: SettingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Settings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SettingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Settings model
   */
  interface SettingsFieldRefs {
    readonly id: FieldRef<"Settings", 'Int'>
    readonly readinessThreshold: FieldRef<"Settings", 'Float'>
    readonly updatedAt: FieldRef<"Settings", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Settings findUnique
   */
  export type SettingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where: SettingsWhereUniqueInput
  }

  /**
   * Settings findUniqueOrThrow
   */
  export type SettingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where: SettingsWhereUniqueInput
  }

  /**
   * Settings findFirst
   */
  export type SettingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingsOrderByWithRelationInput | SettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingsScalarFieldEnum | SettingsScalarFieldEnum[]
  }

  /**
   * Settings findFirstOrThrow
   */
  export type SettingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingsOrderByWithRelationInput | SettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingsScalarFieldEnum | SettingsScalarFieldEnum[]
  }

  /**
   * Settings findMany
   */
  export type SettingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingsOrderByWithRelationInput | SettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Settings.
     */
    cursor?: SettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingsScalarFieldEnum | SettingsScalarFieldEnum[]
  }

  /**
   * Settings create
   */
  export type SettingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * The data needed to create a Settings.
     */
    data: XOR<SettingsCreateInput, SettingsUncheckedCreateInput>
  }

  /**
   * Settings createMany
   */
  export type SettingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Settings.
     */
    data: SettingsCreateManyInput | SettingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Settings createManyAndReturn
   */
  export type SettingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * The data used to create many Settings.
     */
    data: SettingsCreateManyInput | SettingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Settings update
   */
  export type SettingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * The data needed to update a Settings.
     */
    data: XOR<SettingsUpdateInput, SettingsUncheckedUpdateInput>
    /**
     * Choose, which Settings to update.
     */
    where: SettingsWhereUniqueInput
  }

  /**
   * Settings updateMany
   */
  export type SettingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingsUpdateManyMutationInput, SettingsUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingsWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Settings updateManyAndReturn
   */
  export type SettingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingsUpdateManyMutationInput, SettingsUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingsWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Settings upsert
   */
  export type SettingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * The filter to search for the Settings to update in case it exists.
     */
    where: SettingsWhereUniqueInput
    /**
     * In case the Settings found by the `where` argument doesn't exist, create a new Settings with this data.
     */
    create: XOR<SettingsCreateInput, SettingsUncheckedCreateInput>
    /**
     * In case the Settings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SettingsUpdateInput, SettingsUncheckedUpdateInput>
  }

  /**
   * Settings delete
   */
  export type SettingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
    /**
     * Filter which Settings to delete.
     */
    where: SettingsWhereUniqueInput
  }

  /**
   * Settings deleteMany
   */
  export type SettingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Settings to delete
     */
    where?: SettingsWhereInput
    /**
     * Limit how many Settings to delete.
     */
    limit?: number
  }

  /**
   * Settings without action
   */
  export type SettingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Settings
     */
    select?: SettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Settings
     */
    omit?: SettingsOmit<ExtArgs> | null
  }


  /**
   * Model Cohort
   */

  export type AggregateCohort = {
    _count: CohortCountAggregateOutputType | null
    _avg: CohortAvgAggregateOutputType | null
    _sum: CohortSumAggregateOutputType | null
    _min: CohortMinAggregateOutputType | null
    _max: CohortMaxAggregateOutputType | null
  }

  export type CohortAvgAggregateOutputType = {
    id: number | null
  }

  export type CohortSumAggregateOutputType = {
    id: number | null
  }

  export type CohortMinAggregateOutputType = {
    id: number | null
    name: string | null
    startDate: Date | null
    endDate: Date | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CohortMaxAggregateOutputType = {
    id: number | null
    name: string | null
    startDate: Date | null
    endDate: Date | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CohortCountAggregateOutputType = {
    id: number
    name: number
    startDate: number
    endDate: number
    description: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CohortAvgAggregateInputType = {
    id?: true
  }

  export type CohortSumAggregateInputType = {
    id?: true
  }

  export type CohortMinAggregateInputType = {
    id?: true
    name?: true
    startDate?: true
    endDate?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CohortMaxAggregateInputType = {
    id?: true
    name?: true
    startDate?: true
    endDate?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CohortCountAggregateInputType = {
    id?: true
    name?: true
    startDate?: true
    endDate?: true
    description?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CohortAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cohort to aggregate.
     */
    where?: CohortWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cohorts to fetch.
     */
    orderBy?: CohortOrderByWithRelationInput | CohortOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CohortWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cohorts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cohorts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Cohorts
    **/
    _count?: true | CohortCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CohortAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CohortSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CohortMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CohortMaxAggregateInputType
  }

  export type GetCohortAggregateType<T extends CohortAggregateArgs> = {
        [P in keyof T & keyof AggregateCohort]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCohort[P]>
      : GetScalarType<T[P], AggregateCohort[P]>
  }




  export type CohortGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CohortWhereInput
    orderBy?: CohortOrderByWithAggregationInput | CohortOrderByWithAggregationInput[]
    by: CohortScalarFieldEnum[] | CohortScalarFieldEnum
    having?: CohortScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CohortCountAggregateInputType | true
    _avg?: CohortAvgAggregateInputType
    _sum?: CohortSumAggregateInputType
    _min?: CohortMinAggregateInputType
    _max?: CohortMaxAggregateInputType
  }

  export type CohortGroupByOutputType = {
    id: number
    name: string
    startDate: Date
    endDate: Date | null
    description: string | null
    createdAt: Date
    updatedAt: Date
    _count: CohortCountAggregateOutputType | null
    _avg: CohortAvgAggregateOutputType | null
    _sum: CohortSumAggregateOutputType | null
    _min: CohortMinAggregateOutputType | null
    _max: CohortMaxAggregateOutputType | null
  }

  type GetCohortGroupByPayload<T extends CohortGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CohortGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CohortGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CohortGroupByOutputType[P]>
            : GetScalarType<T[P], CohortGroupByOutputType[P]>
        }
      >
    >


  export type CohortSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    startDate?: boolean
    endDate?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    associates?: boolean | Cohort$associatesArgs<ExtArgs>
    sessions?: boolean | Cohort$sessionsArgs<ExtArgs>
    curriculumWeeks?: boolean | Cohort$curriculumWeeksArgs<ExtArgs>
    codingChallenges?: boolean | Cohort$codingChallengesArgs<ExtArgs>
    _count?: boolean | CohortCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cohort"]>

  export type CohortSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    startDate?: boolean
    endDate?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cohort"]>

  export type CohortSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    startDate?: boolean
    endDate?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cohort"]>

  export type CohortSelectScalar = {
    id?: boolean
    name?: boolean
    startDate?: boolean
    endDate?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CohortOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "startDate" | "endDate" | "description" | "createdAt" | "updatedAt", ExtArgs["result"]["cohort"]>
  export type CohortInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associates?: boolean | Cohort$associatesArgs<ExtArgs>
    sessions?: boolean | Cohort$sessionsArgs<ExtArgs>
    curriculumWeeks?: boolean | Cohort$curriculumWeeksArgs<ExtArgs>
    codingChallenges?: boolean | Cohort$codingChallengesArgs<ExtArgs>
    _count?: boolean | CohortCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CohortIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type CohortIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $CohortPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Cohort"
    objects: {
      associates: Prisma.$AssociatePayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      curriculumWeeks: Prisma.$CurriculumWeekPayload<ExtArgs>[]
      codingChallenges: Prisma.$CodingChallengePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      startDate: Date
      endDate: Date | null
      description: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["cohort"]>
    composites: {}
  }

  type CohortGetPayload<S extends boolean | null | undefined | CohortDefaultArgs> = $Result.GetResult<Prisma.$CohortPayload, S>

  type CohortCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CohortFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CohortCountAggregateInputType | true
    }

  export interface CohortDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Cohort'], meta: { name: 'Cohort' } }
    /**
     * Find zero or one Cohort that matches the filter.
     * @param {CohortFindUniqueArgs} args - Arguments to find a Cohort
     * @example
     * // Get one Cohort
     * const cohort = await prisma.cohort.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CohortFindUniqueArgs>(args: SelectSubset<T, CohortFindUniqueArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cohort that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CohortFindUniqueOrThrowArgs} args - Arguments to find a Cohort
     * @example
     * // Get one Cohort
     * const cohort = await prisma.cohort.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CohortFindUniqueOrThrowArgs>(args: SelectSubset<T, CohortFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cohort that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortFindFirstArgs} args - Arguments to find a Cohort
     * @example
     * // Get one Cohort
     * const cohort = await prisma.cohort.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CohortFindFirstArgs>(args?: SelectSubset<T, CohortFindFirstArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cohort that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortFindFirstOrThrowArgs} args - Arguments to find a Cohort
     * @example
     * // Get one Cohort
     * const cohort = await prisma.cohort.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CohortFindFirstOrThrowArgs>(args?: SelectSubset<T, CohortFindFirstOrThrowArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Cohorts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Cohorts
     * const cohorts = await prisma.cohort.findMany()
     * 
     * // Get first 10 Cohorts
     * const cohorts = await prisma.cohort.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cohortWithIdOnly = await prisma.cohort.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CohortFindManyArgs>(args?: SelectSubset<T, CohortFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cohort.
     * @param {CohortCreateArgs} args - Arguments to create a Cohort.
     * @example
     * // Create one Cohort
     * const Cohort = await prisma.cohort.create({
     *   data: {
     *     // ... data to create a Cohort
     *   }
     * })
     * 
     */
    create<T extends CohortCreateArgs>(args: SelectSubset<T, CohortCreateArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Cohorts.
     * @param {CohortCreateManyArgs} args - Arguments to create many Cohorts.
     * @example
     * // Create many Cohorts
     * const cohort = await prisma.cohort.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CohortCreateManyArgs>(args?: SelectSubset<T, CohortCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Cohorts and returns the data saved in the database.
     * @param {CohortCreateManyAndReturnArgs} args - Arguments to create many Cohorts.
     * @example
     * // Create many Cohorts
     * const cohort = await prisma.cohort.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Cohorts and only return the `id`
     * const cohortWithIdOnly = await prisma.cohort.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CohortCreateManyAndReturnArgs>(args?: SelectSubset<T, CohortCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Cohort.
     * @param {CohortDeleteArgs} args - Arguments to delete one Cohort.
     * @example
     * // Delete one Cohort
     * const Cohort = await prisma.cohort.delete({
     *   where: {
     *     // ... filter to delete one Cohort
     *   }
     * })
     * 
     */
    delete<T extends CohortDeleteArgs>(args: SelectSubset<T, CohortDeleteArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cohort.
     * @param {CohortUpdateArgs} args - Arguments to update one Cohort.
     * @example
     * // Update one Cohort
     * const cohort = await prisma.cohort.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CohortUpdateArgs>(args: SelectSubset<T, CohortUpdateArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Cohorts.
     * @param {CohortDeleteManyArgs} args - Arguments to filter Cohorts to delete.
     * @example
     * // Delete a few Cohorts
     * const { count } = await prisma.cohort.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CohortDeleteManyArgs>(args?: SelectSubset<T, CohortDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cohorts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Cohorts
     * const cohort = await prisma.cohort.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CohortUpdateManyArgs>(args: SelectSubset<T, CohortUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cohorts and returns the data updated in the database.
     * @param {CohortUpdateManyAndReturnArgs} args - Arguments to update many Cohorts.
     * @example
     * // Update many Cohorts
     * const cohort = await prisma.cohort.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Cohorts and only return the `id`
     * const cohortWithIdOnly = await prisma.cohort.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CohortUpdateManyAndReturnArgs>(args: SelectSubset<T, CohortUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Cohort.
     * @param {CohortUpsertArgs} args - Arguments to update or create a Cohort.
     * @example
     * // Update or create a Cohort
     * const cohort = await prisma.cohort.upsert({
     *   create: {
     *     // ... data to create a Cohort
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cohort we want to update
     *   }
     * })
     */
    upsert<T extends CohortUpsertArgs>(args: SelectSubset<T, CohortUpsertArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Cohorts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortCountArgs} args - Arguments to filter Cohorts to count.
     * @example
     * // Count the number of Cohorts
     * const count = await prisma.cohort.count({
     *   where: {
     *     // ... the filter for the Cohorts we want to count
     *   }
     * })
    **/
    count<T extends CohortCountArgs>(
      args?: Subset<T, CohortCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CohortCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cohort.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CohortAggregateArgs>(args: Subset<T, CohortAggregateArgs>): Prisma.PrismaPromise<GetCohortAggregateType<T>>

    /**
     * Group by Cohort.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CohortGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CohortGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CohortGroupByArgs['orderBy'] }
        : { orderBy?: CohortGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CohortGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCohortGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Cohort model
   */
  readonly fields: CohortFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Cohort.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CohortClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    associates<T extends Cohort$associatesArgs<ExtArgs> = {}>(args?: Subset<T, Cohort$associatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends Cohort$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, Cohort$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    curriculumWeeks<T extends Cohort$curriculumWeeksArgs<ExtArgs> = {}>(args?: Subset<T, Cohort$curriculumWeeksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    codingChallenges<T extends Cohort$codingChallengesArgs<ExtArgs> = {}>(args?: Subset<T, Cohort$codingChallengesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Cohort model
   */
  interface CohortFieldRefs {
    readonly id: FieldRef<"Cohort", 'Int'>
    readonly name: FieldRef<"Cohort", 'String'>
    readonly startDate: FieldRef<"Cohort", 'DateTime'>
    readonly endDate: FieldRef<"Cohort", 'DateTime'>
    readonly description: FieldRef<"Cohort", 'String'>
    readonly createdAt: FieldRef<"Cohort", 'DateTime'>
    readonly updatedAt: FieldRef<"Cohort", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Cohort findUnique
   */
  export type CohortFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter, which Cohort to fetch.
     */
    where: CohortWhereUniqueInput
  }

  /**
   * Cohort findUniqueOrThrow
   */
  export type CohortFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter, which Cohort to fetch.
     */
    where: CohortWhereUniqueInput
  }

  /**
   * Cohort findFirst
   */
  export type CohortFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter, which Cohort to fetch.
     */
    where?: CohortWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cohorts to fetch.
     */
    orderBy?: CohortOrderByWithRelationInput | CohortOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Cohorts.
     */
    cursor?: CohortWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cohorts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cohorts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Cohorts.
     */
    distinct?: CohortScalarFieldEnum | CohortScalarFieldEnum[]
  }

  /**
   * Cohort findFirstOrThrow
   */
  export type CohortFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter, which Cohort to fetch.
     */
    where?: CohortWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cohorts to fetch.
     */
    orderBy?: CohortOrderByWithRelationInput | CohortOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Cohorts.
     */
    cursor?: CohortWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cohorts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cohorts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Cohorts.
     */
    distinct?: CohortScalarFieldEnum | CohortScalarFieldEnum[]
  }

  /**
   * Cohort findMany
   */
  export type CohortFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter, which Cohorts to fetch.
     */
    where?: CohortWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Cohorts to fetch.
     */
    orderBy?: CohortOrderByWithRelationInput | CohortOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Cohorts.
     */
    cursor?: CohortWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Cohorts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Cohorts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Cohorts.
     */
    distinct?: CohortScalarFieldEnum | CohortScalarFieldEnum[]
  }

  /**
   * Cohort create
   */
  export type CohortCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * The data needed to create a Cohort.
     */
    data: XOR<CohortCreateInput, CohortUncheckedCreateInput>
  }

  /**
   * Cohort createMany
   */
  export type CohortCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Cohorts.
     */
    data: CohortCreateManyInput | CohortCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cohort createManyAndReturn
   */
  export type CohortCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * The data used to create many Cohorts.
     */
    data: CohortCreateManyInput | CohortCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cohort update
   */
  export type CohortUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * The data needed to update a Cohort.
     */
    data: XOR<CohortUpdateInput, CohortUncheckedUpdateInput>
    /**
     * Choose, which Cohort to update.
     */
    where: CohortWhereUniqueInput
  }

  /**
   * Cohort updateMany
   */
  export type CohortUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Cohorts.
     */
    data: XOR<CohortUpdateManyMutationInput, CohortUncheckedUpdateManyInput>
    /**
     * Filter which Cohorts to update
     */
    where?: CohortWhereInput
    /**
     * Limit how many Cohorts to update.
     */
    limit?: number
  }

  /**
   * Cohort updateManyAndReturn
   */
  export type CohortUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * The data used to update Cohorts.
     */
    data: XOR<CohortUpdateManyMutationInput, CohortUncheckedUpdateManyInput>
    /**
     * Filter which Cohorts to update
     */
    where?: CohortWhereInput
    /**
     * Limit how many Cohorts to update.
     */
    limit?: number
  }

  /**
   * Cohort upsert
   */
  export type CohortUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * The filter to search for the Cohort to update in case it exists.
     */
    where: CohortWhereUniqueInput
    /**
     * In case the Cohort found by the `where` argument doesn't exist, create a new Cohort with this data.
     */
    create: XOR<CohortCreateInput, CohortUncheckedCreateInput>
    /**
     * In case the Cohort was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CohortUpdateInput, CohortUncheckedUpdateInput>
  }

  /**
   * Cohort delete
   */
  export type CohortDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    /**
     * Filter which Cohort to delete.
     */
    where: CohortWhereUniqueInput
  }

  /**
   * Cohort deleteMany
   */
  export type CohortDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cohorts to delete
     */
    where?: CohortWhereInput
    /**
     * Limit how many Cohorts to delete.
     */
    limit?: number
  }

  /**
   * Cohort.associates
   */
  export type Cohort$associatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Associate
     */
    select?: AssociateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Associate
     */
    omit?: AssociateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssociateInclude<ExtArgs> | null
    where?: AssociateWhereInput
    orderBy?: AssociateOrderByWithRelationInput | AssociateOrderByWithRelationInput[]
    cursor?: AssociateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AssociateScalarFieldEnum | AssociateScalarFieldEnum[]
  }

  /**
   * Cohort.sessions
   */
  export type Cohort$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Cohort.curriculumWeeks
   */
  export type Cohort$curriculumWeeksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    where?: CurriculumWeekWhereInput
    orderBy?: CurriculumWeekOrderByWithRelationInput | CurriculumWeekOrderByWithRelationInput[]
    cursor?: CurriculumWeekWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CurriculumWeekScalarFieldEnum | CurriculumWeekScalarFieldEnum[]
  }

  /**
   * Cohort.codingChallenges
   */
  export type Cohort$codingChallengesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    where?: CodingChallengeWhereInput
    orderBy?: CodingChallengeOrderByWithRelationInput | CodingChallengeOrderByWithRelationInput[]
    cursor?: CodingChallengeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CodingChallengeScalarFieldEnum | CodingChallengeScalarFieldEnum[]
  }

  /**
   * Cohort without action
   */
  export type CohortDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
  }


  /**
   * Model CurriculumWeek
   */

  export type AggregateCurriculumWeek = {
    _count: CurriculumWeekCountAggregateOutputType | null
    _avg: CurriculumWeekAvgAggregateOutputType | null
    _sum: CurriculumWeekSumAggregateOutputType | null
    _min: CurriculumWeekMinAggregateOutputType | null
    _max: CurriculumWeekMaxAggregateOutputType | null
  }

  export type CurriculumWeekAvgAggregateOutputType = {
    id: number | null
    cohortId: number | null
    weekNumber: number | null
  }

  export type CurriculumWeekSumAggregateOutputType = {
    id: number | null
    cohortId: number | null
    weekNumber: number | null
  }

  export type CurriculumWeekMinAggregateOutputType = {
    id: number | null
    cohortId: number | null
    weekNumber: number | null
    skillName: string | null
    skillSlug: string | null
    startDate: Date | null
  }

  export type CurriculumWeekMaxAggregateOutputType = {
    id: number | null
    cohortId: number | null
    weekNumber: number | null
    skillName: string | null
    skillSlug: string | null
    startDate: Date | null
  }

  export type CurriculumWeekCountAggregateOutputType = {
    id: number
    cohortId: number
    weekNumber: number
    skillName: number
    skillSlug: number
    topicTags: number
    startDate: number
    _all: number
  }


  export type CurriculumWeekAvgAggregateInputType = {
    id?: true
    cohortId?: true
    weekNumber?: true
  }

  export type CurriculumWeekSumAggregateInputType = {
    id?: true
    cohortId?: true
    weekNumber?: true
  }

  export type CurriculumWeekMinAggregateInputType = {
    id?: true
    cohortId?: true
    weekNumber?: true
    skillName?: true
    skillSlug?: true
    startDate?: true
  }

  export type CurriculumWeekMaxAggregateInputType = {
    id?: true
    cohortId?: true
    weekNumber?: true
    skillName?: true
    skillSlug?: true
    startDate?: true
  }

  export type CurriculumWeekCountAggregateInputType = {
    id?: true
    cohortId?: true
    weekNumber?: true
    skillName?: true
    skillSlug?: true
    topicTags?: true
    startDate?: true
    _all?: true
  }

  export type CurriculumWeekAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CurriculumWeek to aggregate.
     */
    where?: CurriculumWeekWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CurriculumWeeks to fetch.
     */
    orderBy?: CurriculumWeekOrderByWithRelationInput | CurriculumWeekOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CurriculumWeekWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CurriculumWeeks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CurriculumWeeks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CurriculumWeeks
    **/
    _count?: true | CurriculumWeekCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CurriculumWeekAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CurriculumWeekSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CurriculumWeekMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CurriculumWeekMaxAggregateInputType
  }

  export type GetCurriculumWeekAggregateType<T extends CurriculumWeekAggregateArgs> = {
        [P in keyof T & keyof AggregateCurriculumWeek]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCurriculumWeek[P]>
      : GetScalarType<T[P], AggregateCurriculumWeek[P]>
  }




  export type CurriculumWeekGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CurriculumWeekWhereInput
    orderBy?: CurriculumWeekOrderByWithAggregationInput | CurriculumWeekOrderByWithAggregationInput[]
    by: CurriculumWeekScalarFieldEnum[] | CurriculumWeekScalarFieldEnum
    having?: CurriculumWeekScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CurriculumWeekCountAggregateInputType | true
    _avg?: CurriculumWeekAvgAggregateInputType
    _sum?: CurriculumWeekSumAggregateInputType
    _min?: CurriculumWeekMinAggregateInputType
    _max?: CurriculumWeekMaxAggregateInputType
  }

  export type CurriculumWeekGroupByOutputType = {
    id: number
    cohortId: number
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags: string[]
    startDate: Date
    _count: CurriculumWeekCountAggregateOutputType | null
    _avg: CurriculumWeekAvgAggregateOutputType | null
    _sum: CurriculumWeekSumAggregateOutputType | null
    _min: CurriculumWeekMinAggregateOutputType | null
    _max: CurriculumWeekMaxAggregateOutputType | null
  }

  type GetCurriculumWeekGroupByPayload<T extends CurriculumWeekGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CurriculumWeekGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CurriculumWeekGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CurriculumWeekGroupByOutputType[P]>
            : GetScalarType<T[P], CurriculumWeekGroupByOutputType[P]>
        }
      >
    >


  export type CurriculumWeekSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cohortId?: boolean
    weekNumber?: boolean
    skillName?: boolean
    skillSlug?: boolean
    topicTags?: boolean
    startDate?: boolean
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["curriculumWeek"]>

  export type CurriculumWeekSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cohortId?: boolean
    weekNumber?: boolean
    skillName?: boolean
    skillSlug?: boolean
    topicTags?: boolean
    startDate?: boolean
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["curriculumWeek"]>

  export type CurriculumWeekSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cohortId?: boolean
    weekNumber?: boolean
    skillName?: boolean
    skillSlug?: boolean
    topicTags?: boolean
    startDate?: boolean
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["curriculumWeek"]>

  export type CurriculumWeekSelectScalar = {
    id?: boolean
    cohortId?: boolean
    weekNumber?: boolean
    skillName?: boolean
    skillSlug?: boolean
    topicTags?: boolean
    startDate?: boolean
  }

  export type CurriculumWeekOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "cohortId" | "weekNumber" | "skillName" | "skillSlug" | "topicTags" | "startDate", ExtArgs["result"]["curriculumWeek"]>
  export type CurriculumWeekInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }
  export type CurriculumWeekIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }
  export type CurriculumWeekIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CohortDefaultArgs<ExtArgs>
  }

  export type $CurriculumWeekPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CurriculumWeek"
    objects: {
      cohort: Prisma.$CohortPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      cohortId: number
      weekNumber: number
      skillName: string
      skillSlug: string
      topicTags: string[]
      startDate: Date
    }, ExtArgs["result"]["curriculumWeek"]>
    composites: {}
  }

  type CurriculumWeekGetPayload<S extends boolean | null | undefined | CurriculumWeekDefaultArgs> = $Result.GetResult<Prisma.$CurriculumWeekPayload, S>

  type CurriculumWeekCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CurriculumWeekFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CurriculumWeekCountAggregateInputType | true
    }

  export interface CurriculumWeekDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CurriculumWeek'], meta: { name: 'CurriculumWeek' } }
    /**
     * Find zero or one CurriculumWeek that matches the filter.
     * @param {CurriculumWeekFindUniqueArgs} args - Arguments to find a CurriculumWeek
     * @example
     * // Get one CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CurriculumWeekFindUniqueArgs>(args: SelectSubset<T, CurriculumWeekFindUniqueArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CurriculumWeek that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CurriculumWeekFindUniqueOrThrowArgs} args - Arguments to find a CurriculumWeek
     * @example
     * // Get one CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CurriculumWeekFindUniqueOrThrowArgs>(args: SelectSubset<T, CurriculumWeekFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CurriculumWeek that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekFindFirstArgs} args - Arguments to find a CurriculumWeek
     * @example
     * // Get one CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CurriculumWeekFindFirstArgs>(args?: SelectSubset<T, CurriculumWeekFindFirstArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CurriculumWeek that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekFindFirstOrThrowArgs} args - Arguments to find a CurriculumWeek
     * @example
     * // Get one CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CurriculumWeekFindFirstOrThrowArgs>(args?: SelectSubset<T, CurriculumWeekFindFirstOrThrowArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CurriculumWeeks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CurriculumWeeks
     * const curriculumWeeks = await prisma.curriculumWeek.findMany()
     * 
     * // Get first 10 CurriculumWeeks
     * const curriculumWeeks = await prisma.curriculumWeek.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const curriculumWeekWithIdOnly = await prisma.curriculumWeek.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CurriculumWeekFindManyArgs>(args?: SelectSubset<T, CurriculumWeekFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CurriculumWeek.
     * @param {CurriculumWeekCreateArgs} args - Arguments to create a CurriculumWeek.
     * @example
     * // Create one CurriculumWeek
     * const CurriculumWeek = await prisma.curriculumWeek.create({
     *   data: {
     *     // ... data to create a CurriculumWeek
     *   }
     * })
     * 
     */
    create<T extends CurriculumWeekCreateArgs>(args: SelectSubset<T, CurriculumWeekCreateArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CurriculumWeeks.
     * @param {CurriculumWeekCreateManyArgs} args - Arguments to create many CurriculumWeeks.
     * @example
     * // Create many CurriculumWeeks
     * const curriculumWeek = await prisma.curriculumWeek.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CurriculumWeekCreateManyArgs>(args?: SelectSubset<T, CurriculumWeekCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CurriculumWeeks and returns the data saved in the database.
     * @param {CurriculumWeekCreateManyAndReturnArgs} args - Arguments to create many CurriculumWeeks.
     * @example
     * // Create many CurriculumWeeks
     * const curriculumWeek = await prisma.curriculumWeek.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CurriculumWeeks and only return the `id`
     * const curriculumWeekWithIdOnly = await prisma.curriculumWeek.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CurriculumWeekCreateManyAndReturnArgs>(args?: SelectSubset<T, CurriculumWeekCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CurriculumWeek.
     * @param {CurriculumWeekDeleteArgs} args - Arguments to delete one CurriculumWeek.
     * @example
     * // Delete one CurriculumWeek
     * const CurriculumWeek = await prisma.curriculumWeek.delete({
     *   where: {
     *     // ... filter to delete one CurriculumWeek
     *   }
     * })
     * 
     */
    delete<T extends CurriculumWeekDeleteArgs>(args: SelectSubset<T, CurriculumWeekDeleteArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CurriculumWeek.
     * @param {CurriculumWeekUpdateArgs} args - Arguments to update one CurriculumWeek.
     * @example
     * // Update one CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CurriculumWeekUpdateArgs>(args: SelectSubset<T, CurriculumWeekUpdateArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CurriculumWeeks.
     * @param {CurriculumWeekDeleteManyArgs} args - Arguments to filter CurriculumWeeks to delete.
     * @example
     * // Delete a few CurriculumWeeks
     * const { count } = await prisma.curriculumWeek.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CurriculumWeekDeleteManyArgs>(args?: SelectSubset<T, CurriculumWeekDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CurriculumWeeks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CurriculumWeeks
     * const curriculumWeek = await prisma.curriculumWeek.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CurriculumWeekUpdateManyArgs>(args: SelectSubset<T, CurriculumWeekUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CurriculumWeeks and returns the data updated in the database.
     * @param {CurriculumWeekUpdateManyAndReturnArgs} args - Arguments to update many CurriculumWeeks.
     * @example
     * // Update many CurriculumWeeks
     * const curriculumWeek = await prisma.curriculumWeek.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CurriculumWeeks and only return the `id`
     * const curriculumWeekWithIdOnly = await prisma.curriculumWeek.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CurriculumWeekUpdateManyAndReturnArgs>(args: SelectSubset<T, CurriculumWeekUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CurriculumWeek.
     * @param {CurriculumWeekUpsertArgs} args - Arguments to update or create a CurriculumWeek.
     * @example
     * // Update or create a CurriculumWeek
     * const curriculumWeek = await prisma.curriculumWeek.upsert({
     *   create: {
     *     // ... data to create a CurriculumWeek
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CurriculumWeek we want to update
     *   }
     * })
     */
    upsert<T extends CurriculumWeekUpsertArgs>(args: SelectSubset<T, CurriculumWeekUpsertArgs<ExtArgs>>): Prisma__CurriculumWeekClient<$Result.GetResult<Prisma.$CurriculumWeekPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CurriculumWeeks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekCountArgs} args - Arguments to filter CurriculumWeeks to count.
     * @example
     * // Count the number of CurriculumWeeks
     * const count = await prisma.curriculumWeek.count({
     *   where: {
     *     // ... the filter for the CurriculumWeeks we want to count
     *   }
     * })
    **/
    count<T extends CurriculumWeekCountArgs>(
      args?: Subset<T, CurriculumWeekCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CurriculumWeekCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CurriculumWeek.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CurriculumWeekAggregateArgs>(args: Subset<T, CurriculumWeekAggregateArgs>): Prisma.PrismaPromise<GetCurriculumWeekAggregateType<T>>

    /**
     * Group by CurriculumWeek.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CurriculumWeekGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CurriculumWeekGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CurriculumWeekGroupByArgs['orderBy'] }
        : { orderBy?: CurriculumWeekGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CurriculumWeekGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCurriculumWeekGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CurriculumWeek model
   */
  readonly fields: CurriculumWeekFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CurriculumWeek.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CurriculumWeekClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cohort<T extends CohortDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CohortDefaultArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CurriculumWeek model
   */
  interface CurriculumWeekFieldRefs {
    readonly id: FieldRef<"CurriculumWeek", 'Int'>
    readonly cohortId: FieldRef<"CurriculumWeek", 'Int'>
    readonly weekNumber: FieldRef<"CurriculumWeek", 'Int'>
    readonly skillName: FieldRef<"CurriculumWeek", 'String'>
    readonly skillSlug: FieldRef<"CurriculumWeek", 'String'>
    readonly topicTags: FieldRef<"CurriculumWeek", 'String[]'>
    readonly startDate: FieldRef<"CurriculumWeek", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CurriculumWeek findUnique
   */
  export type CurriculumWeekFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter, which CurriculumWeek to fetch.
     */
    where: CurriculumWeekWhereUniqueInput
  }

  /**
   * CurriculumWeek findUniqueOrThrow
   */
  export type CurriculumWeekFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter, which CurriculumWeek to fetch.
     */
    where: CurriculumWeekWhereUniqueInput
  }

  /**
   * CurriculumWeek findFirst
   */
  export type CurriculumWeekFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter, which CurriculumWeek to fetch.
     */
    where?: CurriculumWeekWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CurriculumWeeks to fetch.
     */
    orderBy?: CurriculumWeekOrderByWithRelationInput | CurriculumWeekOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CurriculumWeeks.
     */
    cursor?: CurriculumWeekWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CurriculumWeeks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CurriculumWeeks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CurriculumWeeks.
     */
    distinct?: CurriculumWeekScalarFieldEnum | CurriculumWeekScalarFieldEnum[]
  }

  /**
   * CurriculumWeek findFirstOrThrow
   */
  export type CurriculumWeekFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter, which CurriculumWeek to fetch.
     */
    where?: CurriculumWeekWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CurriculumWeeks to fetch.
     */
    orderBy?: CurriculumWeekOrderByWithRelationInput | CurriculumWeekOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CurriculumWeeks.
     */
    cursor?: CurriculumWeekWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CurriculumWeeks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CurriculumWeeks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CurriculumWeeks.
     */
    distinct?: CurriculumWeekScalarFieldEnum | CurriculumWeekScalarFieldEnum[]
  }

  /**
   * CurriculumWeek findMany
   */
  export type CurriculumWeekFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter, which CurriculumWeeks to fetch.
     */
    where?: CurriculumWeekWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CurriculumWeeks to fetch.
     */
    orderBy?: CurriculumWeekOrderByWithRelationInput | CurriculumWeekOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CurriculumWeeks.
     */
    cursor?: CurriculumWeekWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CurriculumWeeks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CurriculumWeeks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CurriculumWeeks.
     */
    distinct?: CurriculumWeekScalarFieldEnum | CurriculumWeekScalarFieldEnum[]
  }

  /**
   * CurriculumWeek create
   */
  export type CurriculumWeekCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * The data needed to create a CurriculumWeek.
     */
    data: XOR<CurriculumWeekCreateInput, CurriculumWeekUncheckedCreateInput>
  }

  /**
   * CurriculumWeek createMany
   */
  export type CurriculumWeekCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CurriculumWeeks.
     */
    data: CurriculumWeekCreateManyInput | CurriculumWeekCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CurriculumWeek createManyAndReturn
   */
  export type CurriculumWeekCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * The data used to create many CurriculumWeeks.
     */
    data: CurriculumWeekCreateManyInput | CurriculumWeekCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CurriculumWeek update
   */
  export type CurriculumWeekUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * The data needed to update a CurriculumWeek.
     */
    data: XOR<CurriculumWeekUpdateInput, CurriculumWeekUncheckedUpdateInput>
    /**
     * Choose, which CurriculumWeek to update.
     */
    where: CurriculumWeekWhereUniqueInput
  }

  /**
   * CurriculumWeek updateMany
   */
  export type CurriculumWeekUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CurriculumWeeks.
     */
    data: XOR<CurriculumWeekUpdateManyMutationInput, CurriculumWeekUncheckedUpdateManyInput>
    /**
     * Filter which CurriculumWeeks to update
     */
    where?: CurriculumWeekWhereInput
    /**
     * Limit how many CurriculumWeeks to update.
     */
    limit?: number
  }

  /**
   * CurriculumWeek updateManyAndReturn
   */
  export type CurriculumWeekUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * The data used to update CurriculumWeeks.
     */
    data: XOR<CurriculumWeekUpdateManyMutationInput, CurriculumWeekUncheckedUpdateManyInput>
    /**
     * Filter which CurriculumWeeks to update
     */
    where?: CurriculumWeekWhereInput
    /**
     * Limit how many CurriculumWeeks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CurriculumWeek upsert
   */
  export type CurriculumWeekUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * The filter to search for the CurriculumWeek to update in case it exists.
     */
    where: CurriculumWeekWhereUniqueInput
    /**
     * In case the CurriculumWeek found by the `where` argument doesn't exist, create a new CurriculumWeek with this data.
     */
    create: XOR<CurriculumWeekCreateInput, CurriculumWeekUncheckedCreateInput>
    /**
     * In case the CurriculumWeek was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CurriculumWeekUpdateInput, CurriculumWeekUncheckedUpdateInput>
  }

  /**
   * CurriculumWeek delete
   */
  export type CurriculumWeekDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
    /**
     * Filter which CurriculumWeek to delete.
     */
    where: CurriculumWeekWhereUniqueInput
  }

  /**
   * CurriculumWeek deleteMany
   */
  export type CurriculumWeekDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CurriculumWeeks to delete
     */
    where?: CurriculumWeekWhereInput
    /**
     * Limit how many CurriculumWeeks to delete.
     */
    limit?: number
  }

  /**
   * CurriculumWeek without action
   */
  export type CurriculumWeekDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CurriculumWeek
     */
    select?: CurriculumWeekSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CurriculumWeek
     */
    omit?: CurriculumWeekOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CurriculumWeekInclude<ExtArgs> | null
  }


  /**
   * Model Profile
   */

  export type AggregateProfile = {
    _count: ProfileCountAggregateOutputType | null
    _avg: ProfileAvgAggregateOutputType | null
    _sum: ProfileSumAggregateOutputType | null
    _min: ProfileMinAggregateOutputType | null
    _max: ProfileMaxAggregateOutputType | null
  }

  export type ProfileAvgAggregateOutputType = {
    id: number | null
  }

  export type ProfileSumAggregateOutputType = {
    id: number | null
  }

  export type ProfileMinAggregateOutputType = {
    id: number | null
    authUserId: string | null
    displayName: string | null
    githubUsername: string | null
    bio: string | null
    learningGoals: string | null
    passwordSetAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProfileMaxAggregateOutputType = {
    id: number | null
    authUserId: string | null
    displayName: string | null
    githubUsername: string | null
    bio: string | null
    learningGoals: string | null
    passwordSetAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProfileCountAggregateOutputType = {
    id: number
    authUserId: number
    displayName: number
    githubUsername: number
    bio: number
    learningGoals: number
    passwordSetAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProfileAvgAggregateInputType = {
    id?: true
  }

  export type ProfileSumAggregateInputType = {
    id?: true
  }

  export type ProfileMinAggregateInputType = {
    id?: true
    authUserId?: true
    displayName?: true
    githubUsername?: true
    bio?: true
    learningGoals?: true
    passwordSetAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProfileMaxAggregateInputType = {
    id?: true
    authUserId?: true
    displayName?: true
    githubUsername?: true
    bio?: true
    learningGoals?: true
    passwordSetAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProfileCountAggregateInputType = {
    id?: true
    authUserId?: true
    displayName?: true
    githubUsername?: true
    bio?: true
    learningGoals?: true
    passwordSetAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Profile to aggregate.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Profiles
    **/
    _count?: true | ProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProfileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProfileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProfileMaxAggregateInputType
  }

  export type GetProfileAggregateType<T extends ProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProfile[P]>
      : GetScalarType<T[P], AggregateProfile[P]>
  }




  export type ProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProfileWhereInput
    orderBy?: ProfileOrderByWithAggregationInput | ProfileOrderByWithAggregationInput[]
    by: ProfileScalarFieldEnum[] | ProfileScalarFieldEnum
    having?: ProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProfileCountAggregateInputType | true
    _avg?: ProfileAvgAggregateInputType
    _sum?: ProfileSumAggregateInputType
    _min?: ProfileMinAggregateInputType
    _max?: ProfileMaxAggregateInputType
  }

  export type ProfileGroupByOutputType = {
    id: number
    authUserId: string
    displayName: string | null
    githubUsername: string | null
    bio: string | null
    learningGoals: string | null
    passwordSetAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProfileCountAggregateOutputType | null
    _avg: ProfileAvgAggregateOutputType | null
    _sum: ProfileSumAggregateOutputType | null
    _min: ProfileMinAggregateOutputType | null
    _max: ProfileMaxAggregateOutputType | null
  }

  type GetProfileGroupByPayload<T extends ProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProfileGroupByOutputType[P]>
            : GetScalarType<T[P], ProfileGroupByOutputType[P]>
        }
      >
    >


  export type ProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    authUserId?: boolean
    displayName?: boolean
    githubUsername?: boolean
    bio?: boolean
    learningGoals?: boolean
    passwordSetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["profile"]>

  export type ProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    authUserId?: boolean
    displayName?: boolean
    githubUsername?: boolean
    bio?: boolean
    learningGoals?: boolean
    passwordSetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["profile"]>

  export type ProfileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    authUserId?: boolean
    displayName?: boolean
    githubUsername?: boolean
    bio?: boolean
    learningGoals?: boolean
    passwordSetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["profile"]>

  export type ProfileSelectScalar = {
    id?: boolean
    authUserId?: boolean
    displayName?: boolean
    githubUsername?: boolean
    bio?: boolean
    learningGoals?: boolean
    passwordSetAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "authUserId" | "displayName" | "githubUsername" | "bio" | "learningGoals" | "passwordSetAt" | "createdAt" | "updatedAt", ExtArgs["result"]["profile"]>

  export type $ProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Profile"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      authUserId: string
      displayName: string | null
      githubUsername: string | null
      bio: string | null
      learningGoals: string | null
      passwordSetAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["profile"]>
    composites: {}
  }

  type ProfileGetPayload<S extends boolean | null | undefined | ProfileDefaultArgs> = $Result.GetResult<Prisma.$ProfilePayload, S>

  type ProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProfileCountAggregateInputType | true
    }

  export interface ProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Profile'], meta: { name: 'Profile' } }
    /**
     * Find zero or one Profile that matches the filter.
     * @param {ProfileFindUniqueArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProfileFindUniqueArgs>(args: SelectSubset<T, ProfileFindUniqueArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Profile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProfileFindUniqueOrThrowArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, ProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Profile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindFirstArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProfileFindFirstArgs>(args?: SelectSubset<T, ProfileFindFirstArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Profile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindFirstOrThrowArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, ProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Profiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Profiles
     * const profiles = await prisma.profile.findMany()
     * 
     * // Get first 10 Profiles
     * const profiles = await prisma.profile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const profileWithIdOnly = await prisma.profile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProfileFindManyArgs>(args?: SelectSubset<T, ProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Profile.
     * @param {ProfileCreateArgs} args - Arguments to create a Profile.
     * @example
     * // Create one Profile
     * const Profile = await prisma.profile.create({
     *   data: {
     *     // ... data to create a Profile
     *   }
     * })
     * 
     */
    create<T extends ProfileCreateArgs>(args: SelectSubset<T, ProfileCreateArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Profiles.
     * @param {ProfileCreateManyArgs} args - Arguments to create many Profiles.
     * @example
     * // Create many Profiles
     * const profile = await prisma.profile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProfileCreateManyArgs>(args?: SelectSubset<T, ProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Profiles and returns the data saved in the database.
     * @param {ProfileCreateManyAndReturnArgs} args - Arguments to create many Profiles.
     * @example
     * // Create many Profiles
     * const profile = await prisma.profile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Profiles and only return the `id`
     * const profileWithIdOnly = await prisma.profile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, ProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Profile.
     * @param {ProfileDeleteArgs} args - Arguments to delete one Profile.
     * @example
     * // Delete one Profile
     * const Profile = await prisma.profile.delete({
     *   where: {
     *     // ... filter to delete one Profile
     *   }
     * })
     * 
     */
    delete<T extends ProfileDeleteArgs>(args: SelectSubset<T, ProfileDeleteArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Profile.
     * @param {ProfileUpdateArgs} args - Arguments to update one Profile.
     * @example
     * // Update one Profile
     * const profile = await prisma.profile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProfileUpdateArgs>(args: SelectSubset<T, ProfileUpdateArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Profiles.
     * @param {ProfileDeleteManyArgs} args - Arguments to filter Profiles to delete.
     * @example
     * // Delete a few Profiles
     * const { count } = await prisma.profile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProfileDeleteManyArgs>(args?: SelectSubset<T, ProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Profiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Profiles
     * const profile = await prisma.profile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProfileUpdateManyArgs>(args: SelectSubset<T, ProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Profiles and returns the data updated in the database.
     * @param {ProfileUpdateManyAndReturnArgs} args - Arguments to update many Profiles.
     * @example
     * // Update many Profiles
     * const profile = await prisma.profile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Profiles and only return the `id`
     * const profileWithIdOnly = await prisma.profile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProfileUpdateManyAndReturnArgs>(args: SelectSubset<T, ProfileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Profile.
     * @param {ProfileUpsertArgs} args - Arguments to update or create a Profile.
     * @example
     * // Update or create a Profile
     * const profile = await prisma.profile.upsert({
     *   create: {
     *     // ... data to create a Profile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Profile we want to update
     *   }
     * })
     */
    upsert<T extends ProfileUpsertArgs>(args: SelectSubset<T, ProfileUpsertArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Profiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileCountArgs} args - Arguments to filter Profiles to count.
     * @example
     * // Count the number of Profiles
     * const count = await prisma.profile.count({
     *   where: {
     *     // ... the filter for the Profiles we want to count
     *   }
     * })
    **/
    count<T extends ProfileCountArgs>(
      args?: Subset<T, ProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Profile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProfileAggregateArgs>(args: Subset<T, ProfileAggregateArgs>): Prisma.PrismaPromise<GetProfileAggregateType<T>>

    /**
     * Group by Profile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProfileGroupByArgs['orderBy'] }
        : { orderBy?: ProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Profile model
   */
  readonly fields: ProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Profile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Profile model
   */
  interface ProfileFieldRefs {
    readonly id: FieldRef<"Profile", 'Int'>
    readonly authUserId: FieldRef<"Profile", 'String'>
    readonly displayName: FieldRef<"Profile", 'String'>
    readonly githubUsername: FieldRef<"Profile", 'String'>
    readonly bio: FieldRef<"Profile", 'String'>
    readonly learningGoals: FieldRef<"Profile", 'String'>
    readonly passwordSetAt: FieldRef<"Profile", 'DateTime'>
    readonly createdAt: FieldRef<"Profile", 'DateTime'>
    readonly updatedAt: FieldRef<"Profile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Profile findUnique
   */
  export type ProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile findUniqueOrThrow
   */
  export type ProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile findFirst
   */
  export type ProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Profiles.
     */
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile findFirstOrThrow
   */
  export type ProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Profiles.
     */
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile findMany
   */
  export type ProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter, which Profiles to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Profiles.
     */
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile create
   */
  export type ProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * The data needed to create a Profile.
     */
    data: XOR<ProfileCreateInput, ProfileUncheckedCreateInput>
  }

  /**
   * Profile createMany
   */
  export type ProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Profiles.
     */
    data: ProfileCreateManyInput | ProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Profile createManyAndReturn
   */
  export type ProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * The data used to create many Profiles.
     */
    data: ProfileCreateManyInput | ProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Profile update
   */
  export type ProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * The data needed to update a Profile.
     */
    data: XOR<ProfileUpdateInput, ProfileUncheckedUpdateInput>
    /**
     * Choose, which Profile to update.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile updateMany
   */
  export type ProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Profiles.
     */
    data: XOR<ProfileUpdateManyMutationInput, ProfileUncheckedUpdateManyInput>
    /**
     * Filter which Profiles to update
     */
    where?: ProfileWhereInput
    /**
     * Limit how many Profiles to update.
     */
    limit?: number
  }

  /**
   * Profile updateManyAndReturn
   */
  export type ProfileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * The data used to update Profiles.
     */
    data: XOR<ProfileUpdateManyMutationInput, ProfileUncheckedUpdateManyInput>
    /**
     * Filter which Profiles to update
     */
    where?: ProfileWhereInput
    /**
     * Limit how many Profiles to update.
     */
    limit?: number
  }

  /**
   * Profile upsert
   */
  export type ProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * The filter to search for the Profile to update in case it exists.
     */
    where: ProfileWhereUniqueInput
    /**
     * In case the Profile found by the `where` argument doesn't exist, create a new Profile with this data.
     */
    create: XOR<ProfileCreateInput, ProfileUncheckedCreateInput>
    /**
     * In case the Profile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProfileUpdateInput, ProfileUncheckedUpdateInput>
  }

  /**
   * Profile delete
   */
  export type ProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Filter which Profile to delete.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile deleteMany
   */
  export type ProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Profiles to delete
     */
    where?: ProfileWhereInput
    /**
     * Limit how many Profiles to delete.
     */
    limit?: number
  }

  /**
   * Profile without action
   */
  export type ProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
  }


  /**
   * Model AuthEvent
   */

  export type AggregateAuthEvent = {
    _count: AuthEventCountAggregateOutputType | null
    _min: AuthEventMinAggregateOutputType | null
    _max: AuthEventMaxAggregateOutputType | null
  }

  export type AuthEventMinAggregateOutputType = {
    id: string | null
    type: string | null
    email: string | null
    ip: string | null
    createdAt: Date | null
  }

  export type AuthEventMaxAggregateOutputType = {
    id: string | null
    type: string | null
    email: string | null
    ip: string | null
    createdAt: Date | null
  }

  export type AuthEventCountAggregateOutputType = {
    id: number
    type: number
    email: number
    ip: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type AuthEventMinAggregateInputType = {
    id?: true
    type?: true
    email?: true
    ip?: true
    createdAt?: true
  }

  export type AuthEventMaxAggregateInputType = {
    id?: true
    type?: true
    email?: true
    ip?: true
    createdAt?: true
  }

  export type AuthEventCountAggregateInputType = {
    id?: true
    type?: true
    email?: true
    ip?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type AuthEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuthEvent to aggregate.
     */
    where?: AuthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuthEvents to fetch.
     */
    orderBy?: AuthEventOrderByWithRelationInput | AuthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuthEvents
    **/
    _count?: true | AuthEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuthEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuthEventMaxAggregateInputType
  }

  export type GetAuthEventAggregateType<T extends AuthEventAggregateArgs> = {
        [P in keyof T & keyof AggregateAuthEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuthEvent[P]>
      : GetScalarType<T[P], AggregateAuthEvent[P]>
  }




  export type AuthEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuthEventWhereInput
    orderBy?: AuthEventOrderByWithAggregationInput | AuthEventOrderByWithAggregationInput[]
    by: AuthEventScalarFieldEnum[] | AuthEventScalarFieldEnum
    having?: AuthEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuthEventCountAggregateInputType | true
    _min?: AuthEventMinAggregateInputType
    _max?: AuthEventMaxAggregateInputType
  }

  export type AuthEventGroupByOutputType = {
    id: string
    type: string
    email: string
    ip: string
    metadata: JsonValue | null
    createdAt: Date
    _count: AuthEventCountAggregateOutputType | null
    _min: AuthEventMinAggregateOutputType | null
    _max: AuthEventMaxAggregateOutputType | null
  }

  type GetAuthEventGroupByPayload<T extends AuthEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuthEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuthEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuthEventGroupByOutputType[P]>
            : GetScalarType<T[P], AuthEventGroupByOutputType[P]>
        }
      >
    >


  export type AuthEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    email?: boolean
    ip?: boolean
    metadata?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["authEvent"]>

  export type AuthEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    email?: boolean
    ip?: boolean
    metadata?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["authEvent"]>

  export type AuthEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    email?: boolean
    ip?: boolean
    metadata?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["authEvent"]>

  export type AuthEventSelectScalar = {
    id?: boolean
    type?: boolean
    email?: boolean
    ip?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type AuthEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "type" | "email" | "ip" | "metadata" | "createdAt", ExtArgs["result"]["authEvent"]>

  export type $AuthEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuthEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      type: string
      email: string
      ip: string
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["authEvent"]>
    composites: {}
  }

  type AuthEventGetPayload<S extends boolean | null | undefined | AuthEventDefaultArgs> = $Result.GetResult<Prisma.$AuthEventPayload, S>

  type AuthEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuthEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuthEventCountAggregateInputType | true
    }

  export interface AuthEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuthEvent'], meta: { name: 'AuthEvent' } }
    /**
     * Find zero or one AuthEvent that matches the filter.
     * @param {AuthEventFindUniqueArgs} args - Arguments to find a AuthEvent
     * @example
     * // Get one AuthEvent
     * const authEvent = await prisma.authEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuthEventFindUniqueArgs>(args: SelectSubset<T, AuthEventFindUniqueArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuthEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuthEventFindUniqueOrThrowArgs} args - Arguments to find a AuthEvent
     * @example
     * // Get one AuthEvent
     * const authEvent = await prisma.authEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuthEventFindUniqueOrThrowArgs>(args: SelectSubset<T, AuthEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuthEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventFindFirstArgs} args - Arguments to find a AuthEvent
     * @example
     * // Get one AuthEvent
     * const authEvent = await prisma.authEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuthEventFindFirstArgs>(args?: SelectSubset<T, AuthEventFindFirstArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuthEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventFindFirstOrThrowArgs} args - Arguments to find a AuthEvent
     * @example
     * // Get one AuthEvent
     * const authEvent = await prisma.authEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuthEventFindFirstOrThrowArgs>(args?: SelectSubset<T, AuthEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuthEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuthEvents
     * const authEvents = await prisma.authEvent.findMany()
     * 
     * // Get first 10 AuthEvents
     * const authEvents = await prisma.authEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const authEventWithIdOnly = await prisma.authEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuthEventFindManyArgs>(args?: SelectSubset<T, AuthEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuthEvent.
     * @param {AuthEventCreateArgs} args - Arguments to create a AuthEvent.
     * @example
     * // Create one AuthEvent
     * const AuthEvent = await prisma.authEvent.create({
     *   data: {
     *     // ... data to create a AuthEvent
     *   }
     * })
     * 
     */
    create<T extends AuthEventCreateArgs>(args: SelectSubset<T, AuthEventCreateArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuthEvents.
     * @param {AuthEventCreateManyArgs} args - Arguments to create many AuthEvents.
     * @example
     * // Create many AuthEvents
     * const authEvent = await prisma.authEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuthEventCreateManyArgs>(args?: SelectSubset<T, AuthEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuthEvents and returns the data saved in the database.
     * @param {AuthEventCreateManyAndReturnArgs} args - Arguments to create many AuthEvents.
     * @example
     * // Create many AuthEvents
     * const authEvent = await prisma.authEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuthEvents and only return the `id`
     * const authEventWithIdOnly = await prisma.authEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuthEventCreateManyAndReturnArgs>(args?: SelectSubset<T, AuthEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuthEvent.
     * @param {AuthEventDeleteArgs} args - Arguments to delete one AuthEvent.
     * @example
     * // Delete one AuthEvent
     * const AuthEvent = await prisma.authEvent.delete({
     *   where: {
     *     // ... filter to delete one AuthEvent
     *   }
     * })
     * 
     */
    delete<T extends AuthEventDeleteArgs>(args: SelectSubset<T, AuthEventDeleteArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuthEvent.
     * @param {AuthEventUpdateArgs} args - Arguments to update one AuthEvent.
     * @example
     * // Update one AuthEvent
     * const authEvent = await prisma.authEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuthEventUpdateArgs>(args: SelectSubset<T, AuthEventUpdateArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuthEvents.
     * @param {AuthEventDeleteManyArgs} args - Arguments to filter AuthEvents to delete.
     * @example
     * // Delete a few AuthEvents
     * const { count } = await prisma.authEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuthEventDeleteManyArgs>(args?: SelectSubset<T, AuthEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuthEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuthEvents
     * const authEvent = await prisma.authEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuthEventUpdateManyArgs>(args: SelectSubset<T, AuthEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuthEvents and returns the data updated in the database.
     * @param {AuthEventUpdateManyAndReturnArgs} args - Arguments to update many AuthEvents.
     * @example
     * // Update many AuthEvents
     * const authEvent = await prisma.authEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuthEvents and only return the `id`
     * const authEventWithIdOnly = await prisma.authEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuthEventUpdateManyAndReturnArgs>(args: SelectSubset<T, AuthEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuthEvent.
     * @param {AuthEventUpsertArgs} args - Arguments to update or create a AuthEvent.
     * @example
     * // Update or create a AuthEvent
     * const authEvent = await prisma.authEvent.upsert({
     *   create: {
     *     // ... data to create a AuthEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuthEvent we want to update
     *   }
     * })
     */
    upsert<T extends AuthEventUpsertArgs>(args: SelectSubset<T, AuthEventUpsertArgs<ExtArgs>>): Prisma__AuthEventClient<$Result.GetResult<Prisma.$AuthEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuthEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventCountArgs} args - Arguments to filter AuthEvents to count.
     * @example
     * // Count the number of AuthEvents
     * const count = await prisma.authEvent.count({
     *   where: {
     *     // ... the filter for the AuthEvents we want to count
     *   }
     * })
    **/
    count<T extends AuthEventCountArgs>(
      args?: Subset<T, AuthEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuthEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuthEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuthEventAggregateArgs>(args: Subset<T, AuthEventAggregateArgs>): Prisma.PrismaPromise<GetAuthEventAggregateType<T>>

    /**
     * Group by AuthEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuthEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuthEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuthEventGroupByArgs['orderBy'] }
        : { orderBy?: AuthEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuthEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuthEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuthEvent model
   */
  readonly fields: AuthEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuthEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuthEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuthEvent model
   */
  interface AuthEventFieldRefs {
    readonly id: FieldRef<"AuthEvent", 'String'>
    readonly type: FieldRef<"AuthEvent", 'String'>
    readonly email: FieldRef<"AuthEvent", 'String'>
    readonly ip: FieldRef<"AuthEvent", 'String'>
    readonly metadata: FieldRef<"AuthEvent", 'Json'>
    readonly createdAt: FieldRef<"AuthEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuthEvent findUnique
   */
  export type AuthEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter, which AuthEvent to fetch.
     */
    where: AuthEventWhereUniqueInput
  }

  /**
   * AuthEvent findUniqueOrThrow
   */
  export type AuthEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter, which AuthEvent to fetch.
     */
    where: AuthEventWhereUniqueInput
  }

  /**
   * AuthEvent findFirst
   */
  export type AuthEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter, which AuthEvent to fetch.
     */
    where?: AuthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuthEvents to fetch.
     */
    orderBy?: AuthEventOrderByWithRelationInput | AuthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuthEvents.
     */
    cursor?: AuthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuthEvents.
     */
    distinct?: AuthEventScalarFieldEnum | AuthEventScalarFieldEnum[]
  }

  /**
   * AuthEvent findFirstOrThrow
   */
  export type AuthEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter, which AuthEvent to fetch.
     */
    where?: AuthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuthEvents to fetch.
     */
    orderBy?: AuthEventOrderByWithRelationInput | AuthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuthEvents.
     */
    cursor?: AuthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuthEvents.
     */
    distinct?: AuthEventScalarFieldEnum | AuthEventScalarFieldEnum[]
  }

  /**
   * AuthEvent findMany
   */
  export type AuthEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter, which AuthEvents to fetch.
     */
    where?: AuthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuthEvents to fetch.
     */
    orderBy?: AuthEventOrderByWithRelationInput | AuthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuthEvents.
     */
    cursor?: AuthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuthEvents.
     */
    distinct?: AuthEventScalarFieldEnum | AuthEventScalarFieldEnum[]
  }

  /**
   * AuthEvent create
   */
  export type AuthEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * The data needed to create a AuthEvent.
     */
    data: XOR<AuthEventCreateInput, AuthEventUncheckedCreateInput>
  }

  /**
   * AuthEvent createMany
   */
  export type AuthEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuthEvents.
     */
    data: AuthEventCreateManyInput | AuthEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuthEvent createManyAndReturn
   */
  export type AuthEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * The data used to create many AuthEvents.
     */
    data: AuthEventCreateManyInput | AuthEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuthEvent update
   */
  export type AuthEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * The data needed to update a AuthEvent.
     */
    data: XOR<AuthEventUpdateInput, AuthEventUncheckedUpdateInput>
    /**
     * Choose, which AuthEvent to update.
     */
    where: AuthEventWhereUniqueInput
  }

  /**
   * AuthEvent updateMany
   */
  export type AuthEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuthEvents.
     */
    data: XOR<AuthEventUpdateManyMutationInput, AuthEventUncheckedUpdateManyInput>
    /**
     * Filter which AuthEvents to update
     */
    where?: AuthEventWhereInput
    /**
     * Limit how many AuthEvents to update.
     */
    limit?: number
  }

  /**
   * AuthEvent updateManyAndReturn
   */
  export type AuthEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * The data used to update AuthEvents.
     */
    data: XOR<AuthEventUpdateManyMutationInput, AuthEventUncheckedUpdateManyInput>
    /**
     * Filter which AuthEvents to update
     */
    where?: AuthEventWhereInput
    /**
     * Limit how many AuthEvents to update.
     */
    limit?: number
  }

  /**
   * AuthEvent upsert
   */
  export type AuthEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * The filter to search for the AuthEvent to update in case it exists.
     */
    where: AuthEventWhereUniqueInput
    /**
     * In case the AuthEvent found by the `where` argument doesn't exist, create a new AuthEvent with this data.
     */
    create: XOR<AuthEventCreateInput, AuthEventUncheckedCreateInput>
    /**
     * In case the AuthEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuthEventUpdateInput, AuthEventUncheckedUpdateInput>
  }

  /**
   * AuthEvent delete
   */
  export type AuthEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
    /**
     * Filter which AuthEvent to delete.
     */
    where: AuthEventWhereUniqueInput
  }

  /**
   * AuthEvent deleteMany
   */
  export type AuthEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuthEvents to delete
     */
    where?: AuthEventWhereInput
    /**
     * Limit how many AuthEvents to delete.
     */
    limit?: number
  }

  /**
   * AuthEvent without action
   */
  export type AuthEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuthEvent
     */
    select?: AuthEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuthEvent
     */
    omit?: AuthEventOmit<ExtArgs> | null
  }


  /**
   * Model CodingChallenge
   */

  export type AggregateCodingChallenge = {
    _count: CodingChallengeCountAggregateOutputType | null
    _avg: CodingChallengeAvgAggregateOutputType | null
    _sum: CodingChallengeSumAggregateOutputType | null
    _min: CodingChallengeMinAggregateOutputType | null
    _max: CodingChallengeMaxAggregateOutputType | null
  }

  export type CodingChallengeAvgAggregateOutputType = {
    cohortId: number | null
  }

  export type CodingChallengeSumAggregateOutputType = {
    cohortId: number | null
  }

  export type CodingChallengeMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    language: string | null
    difficulty: string | null
    description: string | null
    skillSlug: string | null
    cohortId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CodingChallengeMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    language: string | null
    difficulty: string | null
    description: string | null
    skillSlug: string | null
    cohortId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CodingChallengeCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    language: number
    difficulty: number
    description: number
    skillSlug: number
    cohortId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CodingChallengeAvgAggregateInputType = {
    cohortId?: true
  }

  export type CodingChallengeSumAggregateInputType = {
    cohortId?: true
  }

  export type CodingChallengeMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    language?: true
    difficulty?: true
    description?: true
    skillSlug?: true
    cohortId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CodingChallengeMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    language?: true
    difficulty?: true
    description?: true
    skillSlug?: true
    cohortId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CodingChallengeCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    language?: true
    difficulty?: true
    description?: true
    skillSlug?: true
    cohortId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CodingChallengeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingChallenge to aggregate.
     */
    where?: CodingChallengeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingChallenges to fetch.
     */
    orderBy?: CodingChallengeOrderByWithRelationInput | CodingChallengeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CodingChallengeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingChallenges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingChallenges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CodingChallenges
    **/
    _count?: true | CodingChallengeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CodingChallengeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CodingChallengeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CodingChallengeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CodingChallengeMaxAggregateInputType
  }

  export type GetCodingChallengeAggregateType<T extends CodingChallengeAggregateArgs> = {
        [P in keyof T & keyof AggregateCodingChallenge]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCodingChallenge[P]>
      : GetScalarType<T[P], AggregateCodingChallenge[P]>
  }




  export type CodingChallengeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingChallengeWhereInput
    orderBy?: CodingChallengeOrderByWithAggregationInput | CodingChallengeOrderByWithAggregationInput[]
    by: CodingChallengeScalarFieldEnum[] | CodingChallengeScalarFieldEnum
    having?: CodingChallengeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CodingChallengeCountAggregateInputType | true
    _avg?: CodingChallengeAvgAggregateInputType
    _sum?: CodingChallengeSumAggregateInputType
    _min?: CodingChallengeMinAggregateInputType
    _max?: CodingChallengeMaxAggregateInputType
  }

  export type CodingChallengeGroupByOutputType = {
    id: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    cohortId: number | null
    createdAt: Date
    updatedAt: Date
    _count: CodingChallengeCountAggregateOutputType | null
    _avg: CodingChallengeAvgAggregateOutputType | null
    _sum: CodingChallengeSumAggregateOutputType | null
    _min: CodingChallengeMinAggregateOutputType | null
    _max: CodingChallengeMaxAggregateOutputType | null
  }

  type GetCodingChallengeGroupByPayload<T extends CodingChallengeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CodingChallengeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CodingChallengeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CodingChallengeGroupByOutputType[P]>
            : GetScalarType<T[P], CodingChallengeGroupByOutputType[P]>
        }
      >
    >


  export type CodingChallengeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    language?: boolean
    difficulty?: boolean
    description?: boolean
    skillSlug?: boolean
    cohortId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
    attempts?: boolean | CodingChallenge$attemptsArgs<ExtArgs>
    testCases?: boolean | CodingChallenge$testCasesArgs<ExtArgs>
    _count?: boolean | CodingChallengeCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingChallenge"]>

  export type CodingChallengeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    language?: boolean
    difficulty?: boolean
    description?: boolean
    skillSlug?: boolean
    cohortId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["codingChallenge"]>

  export type CodingChallengeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    language?: boolean
    difficulty?: boolean
    description?: boolean
    skillSlug?: boolean
    cohortId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
  }, ExtArgs["result"]["codingChallenge"]>

  export type CodingChallengeSelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    language?: boolean
    difficulty?: boolean
    description?: boolean
    skillSlug?: boolean
    cohortId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CodingChallengeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "title" | "language" | "difficulty" | "description" | "skillSlug" | "cohortId" | "createdAt" | "updatedAt", ExtArgs["result"]["codingChallenge"]>
  export type CodingChallengeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
    attempts?: boolean | CodingChallenge$attemptsArgs<ExtArgs>
    testCases?: boolean | CodingChallenge$testCasesArgs<ExtArgs>
    _count?: boolean | CodingChallengeCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CodingChallengeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
  }
  export type CodingChallengeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cohort?: boolean | CodingChallenge$cohortArgs<ExtArgs>
  }

  export type $CodingChallengePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CodingChallenge"
    objects: {
      cohort: Prisma.$CohortPayload<ExtArgs> | null
      attempts: Prisma.$CodingAttemptPayload<ExtArgs>[]
      testCases: Prisma.$CodingTestCasePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      language: string
      difficulty: string
      description: string
      skillSlug: string
      cohortId: number | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["codingChallenge"]>
    composites: {}
  }

  type CodingChallengeGetPayload<S extends boolean | null | undefined | CodingChallengeDefaultArgs> = $Result.GetResult<Prisma.$CodingChallengePayload, S>

  type CodingChallengeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CodingChallengeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CodingChallengeCountAggregateInputType | true
    }

  export interface CodingChallengeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CodingChallenge'], meta: { name: 'CodingChallenge' } }
    /**
     * Find zero or one CodingChallenge that matches the filter.
     * @param {CodingChallengeFindUniqueArgs} args - Arguments to find a CodingChallenge
     * @example
     * // Get one CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CodingChallengeFindUniqueArgs>(args: SelectSubset<T, CodingChallengeFindUniqueArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CodingChallenge that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CodingChallengeFindUniqueOrThrowArgs} args - Arguments to find a CodingChallenge
     * @example
     * // Get one CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CodingChallengeFindUniqueOrThrowArgs>(args: SelectSubset<T, CodingChallengeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingChallenge that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeFindFirstArgs} args - Arguments to find a CodingChallenge
     * @example
     * // Get one CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CodingChallengeFindFirstArgs>(args?: SelectSubset<T, CodingChallengeFindFirstArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingChallenge that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeFindFirstOrThrowArgs} args - Arguments to find a CodingChallenge
     * @example
     * // Get one CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CodingChallengeFindFirstOrThrowArgs>(args?: SelectSubset<T, CodingChallengeFindFirstOrThrowArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CodingChallenges that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CodingChallenges
     * const codingChallenges = await prisma.codingChallenge.findMany()
     * 
     * // Get first 10 CodingChallenges
     * const codingChallenges = await prisma.codingChallenge.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const codingChallengeWithIdOnly = await prisma.codingChallenge.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CodingChallengeFindManyArgs>(args?: SelectSubset<T, CodingChallengeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CodingChallenge.
     * @param {CodingChallengeCreateArgs} args - Arguments to create a CodingChallenge.
     * @example
     * // Create one CodingChallenge
     * const CodingChallenge = await prisma.codingChallenge.create({
     *   data: {
     *     // ... data to create a CodingChallenge
     *   }
     * })
     * 
     */
    create<T extends CodingChallengeCreateArgs>(args: SelectSubset<T, CodingChallengeCreateArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CodingChallenges.
     * @param {CodingChallengeCreateManyArgs} args - Arguments to create many CodingChallenges.
     * @example
     * // Create many CodingChallenges
     * const codingChallenge = await prisma.codingChallenge.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CodingChallengeCreateManyArgs>(args?: SelectSubset<T, CodingChallengeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CodingChallenges and returns the data saved in the database.
     * @param {CodingChallengeCreateManyAndReturnArgs} args - Arguments to create many CodingChallenges.
     * @example
     * // Create many CodingChallenges
     * const codingChallenge = await prisma.codingChallenge.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CodingChallenges and only return the `id`
     * const codingChallengeWithIdOnly = await prisma.codingChallenge.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CodingChallengeCreateManyAndReturnArgs>(args?: SelectSubset<T, CodingChallengeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CodingChallenge.
     * @param {CodingChallengeDeleteArgs} args - Arguments to delete one CodingChallenge.
     * @example
     * // Delete one CodingChallenge
     * const CodingChallenge = await prisma.codingChallenge.delete({
     *   where: {
     *     // ... filter to delete one CodingChallenge
     *   }
     * })
     * 
     */
    delete<T extends CodingChallengeDeleteArgs>(args: SelectSubset<T, CodingChallengeDeleteArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CodingChallenge.
     * @param {CodingChallengeUpdateArgs} args - Arguments to update one CodingChallenge.
     * @example
     * // Update one CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CodingChallengeUpdateArgs>(args: SelectSubset<T, CodingChallengeUpdateArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CodingChallenges.
     * @param {CodingChallengeDeleteManyArgs} args - Arguments to filter CodingChallenges to delete.
     * @example
     * // Delete a few CodingChallenges
     * const { count } = await prisma.codingChallenge.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CodingChallengeDeleteManyArgs>(args?: SelectSubset<T, CodingChallengeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingChallenges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CodingChallenges
     * const codingChallenge = await prisma.codingChallenge.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CodingChallengeUpdateManyArgs>(args: SelectSubset<T, CodingChallengeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingChallenges and returns the data updated in the database.
     * @param {CodingChallengeUpdateManyAndReturnArgs} args - Arguments to update many CodingChallenges.
     * @example
     * // Update many CodingChallenges
     * const codingChallenge = await prisma.codingChallenge.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CodingChallenges and only return the `id`
     * const codingChallengeWithIdOnly = await prisma.codingChallenge.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CodingChallengeUpdateManyAndReturnArgs>(args: SelectSubset<T, CodingChallengeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CodingChallenge.
     * @param {CodingChallengeUpsertArgs} args - Arguments to update or create a CodingChallenge.
     * @example
     * // Update or create a CodingChallenge
     * const codingChallenge = await prisma.codingChallenge.upsert({
     *   create: {
     *     // ... data to create a CodingChallenge
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CodingChallenge we want to update
     *   }
     * })
     */
    upsert<T extends CodingChallengeUpsertArgs>(args: SelectSubset<T, CodingChallengeUpsertArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CodingChallenges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeCountArgs} args - Arguments to filter CodingChallenges to count.
     * @example
     * // Count the number of CodingChallenges
     * const count = await prisma.codingChallenge.count({
     *   where: {
     *     // ... the filter for the CodingChallenges we want to count
     *   }
     * })
    **/
    count<T extends CodingChallengeCountArgs>(
      args?: Subset<T, CodingChallengeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CodingChallengeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CodingChallenge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CodingChallengeAggregateArgs>(args: Subset<T, CodingChallengeAggregateArgs>): Prisma.PrismaPromise<GetCodingChallengeAggregateType<T>>

    /**
     * Group by CodingChallenge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingChallengeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CodingChallengeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CodingChallengeGroupByArgs['orderBy'] }
        : { orderBy?: CodingChallengeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CodingChallengeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCodingChallengeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CodingChallenge model
   */
  readonly fields: CodingChallengeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CodingChallenge.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CodingChallengeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cohort<T extends CodingChallenge$cohortArgs<ExtArgs> = {}>(args?: Subset<T, CodingChallenge$cohortArgs<ExtArgs>>): Prisma__CohortClient<$Result.GetResult<Prisma.$CohortPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    attempts<T extends CodingChallenge$attemptsArgs<ExtArgs> = {}>(args?: Subset<T, CodingChallenge$attemptsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    testCases<T extends CodingChallenge$testCasesArgs<ExtArgs> = {}>(args?: Subset<T, CodingChallenge$testCasesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CodingChallenge model
   */
  interface CodingChallengeFieldRefs {
    readonly id: FieldRef<"CodingChallenge", 'String'>
    readonly slug: FieldRef<"CodingChallenge", 'String'>
    readonly title: FieldRef<"CodingChallenge", 'String'>
    readonly language: FieldRef<"CodingChallenge", 'String'>
    readonly difficulty: FieldRef<"CodingChallenge", 'String'>
    readonly description: FieldRef<"CodingChallenge", 'String'>
    readonly skillSlug: FieldRef<"CodingChallenge", 'String'>
    readonly cohortId: FieldRef<"CodingChallenge", 'Int'>
    readonly createdAt: FieldRef<"CodingChallenge", 'DateTime'>
    readonly updatedAt: FieldRef<"CodingChallenge", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CodingChallenge findUnique
   */
  export type CodingChallengeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter, which CodingChallenge to fetch.
     */
    where: CodingChallengeWhereUniqueInput
  }

  /**
   * CodingChallenge findUniqueOrThrow
   */
  export type CodingChallengeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter, which CodingChallenge to fetch.
     */
    where: CodingChallengeWhereUniqueInput
  }

  /**
   * CodingChallenge findFirst
   */
  export type CodingChallengeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter, which CodingChallenge to fetch.
     */
    where?: CodingChallengeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingChallenges to fetch.
     */
    orderBy?: CodingChallengeOrderByWithRelationInput | CodingChallengeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingChallenges.
     */
    cursor?: CodingChallengeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingChallenges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingChallenges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingChallenges.
     */
    distinct?: CodingChallengeScalarFieldEnum | CodingChallengeScalarFieldEnum[]
  }

  /**
   * CodingChallenge findFirstOrThrow
   */
  export type CodingChallengeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter, which CodingChallenge to fetch.
     */
    where?: CodingChallengeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingChallenges to fetch.
     */
    orderBy?: CodingChallengeOrderByWithRelationInput | CodingChallengeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingChallenges.
     */
    cursor?: CodingChallengeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingChallenges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingChallenges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingChallenges.
     */
    distinct?: CodingChallengeScalarFieldEnum | CodingChallengeScalarFieldEnum[]
  }

  /**
   * CodingChallenge findMany
   */
  export type CodingChallengeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter, which CodingChallenges to fetch.
     */
    where?: CodingChallengeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingChallenges to fetch.
     */
    orderBy?: CodingChallengeOrderByWithRelationInput | CodingChallengeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CodingChallenges.
     */
    cursor?: CodingChallengeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingChallenges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingChallenges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingChallenges.
     */
    distinct?: CodingChallengeScalarFieldEnum | CodingChallengeScalarFieldEnum[]
  }

  /**
   * CodingChallenge create
   */
  export type CodingChallengeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * The data needed to create a CodingChallenge.
     */
    data: XOR<CodingChallengeCreateInput, CodingChallengeUncheckedCreateInput>
  }

  /**
   * CodingChallenge createMany
   */
  export type CodingChallengeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CodingChallenges.
     */
    data: CodingChallengeCreateManyInput | CodingChallengeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CodingChallenge createManyAndReturn
   */
  export type CodingChallengeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * The data used to create many CodingChallenges.
     */
    data: CodingChallengeCreateManyInput | CodingChallengeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingChallenge update
   */
  export type CodingChallengeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * The data needed to update a CodingChallenge.
     */
    data: XOR<CodingChallengeUpdateInput, CodingChallengeUncheckedUpdateInput>
    /**
     * Choose, which CodingChallenge to update.
     */
    where: CodingChallengeWhereUniqueInput
  }

  /**
   * CodingChallenge updateMany
   */
  export type CodingChallengeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CodingChallenges.
     */
    data: XOR<CodingChallengeUpdateManyMutationInput, CodingChallengeUncheckedUpdateManyInput>
    /**
     * Filter which CodingChallenges to update
     */
    where?: CodingChallengeWhereInput
    /**
     * Limit how many CodingChallenges to update.
     */
    limit?: number
  }

  /**
   * CodingChallenge updateManyAndReturn
   */
  export type CodingChallengeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * The data used to update CodingChallenges.
     */
    data: XOR<CodingChallengeUpdateManyMutationInput, CodingChallengeUncheckedUpdateManyInput>
    /**
     * Filter which CodingChallenges to update
     */
    where?: CodingChallengeWhereInput
    /**
     * Limit how many CodingChallenges to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingChallenge upsert
   */
  export type CodingChallengeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * The filter to search for the CodingChallenge to update in case it exists.
     */
    where: CodingChallengeWhereUniqueInput
    /**
     * In case the CodingChallenge found by the `where` argument doesn't exist, create a new CodingChallenge with this data.
     */
    create: XOR<CodingChallengeCreateInput, CodingChallengeUncheckedCreateInput>
    /**
     * In case the CodingChallenge was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CodingChallengeUpdateInput, CodingChallengeUncheckedUpdateInput>
  }

  /**
   * CodingChallenge delete
   */
  export type CodingChallengeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
    /**
     * Filter which CodingChallenge to delete.
     */
    where: CodingChallengeWhereUniqueInput
  }

  /**
   * CodingChallenge deleteMany
   */
  export type CodingChallengeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingChallenges to delete
     */
    where?: CodingChallengeWhereInput
    /**
     * Limit how many CodingChallenges to delete.
     */
    limit?: number
  }

  /**
   * CodingChallenge.cohort
   */
  export type CodingChallenge$cohortArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cohort
     */
    select?: CohortSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cohort
     */
    omit?: CohortOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CohortInclude<ExtArgs> | null
    where?: CohortWhereInput
  }

  /**
   * CodingChallenge.attempts
   */
  export type CodingChallenge$attemptsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    where?: CodingAttemptWhereInput
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    cursor?: CodingAttemptWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CodingAttemptScalarFieldEnum | CodingAttemptScalarFieldEnum[]
  }

  /**
   * CodingChallenge.testCases
   */
  export type CodingChallenge$testCasesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    where?: CodingTestCaseWhereInput
    orderBy?: CodingTestCaseOrderByWithRelationInput | CodingTestCaseOrderByWithRelationInput[]
    cursor?: CodingTestCaseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CodingTestCaseScalarFieldEnum | CodingTestCaseScalarFieldEnum[]
  }

  /**
   * CodingChallenge without action
   */
  export type CodingChallengeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingChallenge
     */
    select?: CodingChallengeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingChallenge
     */
    omit?: CodingChallengeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingChallengeInclude<ExtArgs> | null
  }


  /**
   * Model CodingAttempt
   */

  export type AggregateCodingAttempt = {
    _count: CodingAttemptCountAggregateOutputType | null
    _avg: CodingAttemptAvgAggregateOutputType | null
    _sum: CodingAttemptSumAggregateOutputType | null
    _min: CodingAttemptMinAggregateOutputType | null
    _max: CodingAttemptMaxAggregateOutputType | null
  }

  export type CodingAttemptAvgAggregateOutputType = {
    associateId: number | null
    score: number | null
  }

  export type CodingAttemptSumAggregateOutputType = {
    associateId: number | null
    score: number | null
  }

  export type CodingAttemptMinAggregateOutputType = {
    id: string | null
    associateId: number | null
    challengeId: string | null
    submittedCode: string | null
    language: string | null
    verdict: string | null
    score: number | null
    judge0Token: string | null
    submittedAt: Date | null
    completedAt: Date | null
  }

  export type CodingAttemptMaxAggregateOutputType = {
    id: string | null
    associateId: number | null
    challengeId: string | null
    submittedCode: string | null
    language: string | null
    verdict: string | null
    score: number | null
    judge0Token: string | null
    submittedAt: Date | null
    completedAt: Date | null
  }

  export type CodingAttemptCountAggregateOutputType = {
    id: number
    associateId: number
    challengeId: number
    submittedCode: number
    language: number
    verdict: number
    visibleTestResults: number
    hiddenTestResults: number
    score: number
    judge0Token: number
    submittedAt: number
    completedAt: number
    _all: number
  }


  export type CodingAttemptAvgAggregateInputType = {
    associateId?: true
    score?: true
  }

  export type CodingAttemptSumAggregateInputType = {
    associateId?: true
    score?: true
  }

  export type CodingAttemptMinAggregateInputType = {
    id?: true
    associateId?: true
    challengeId?: true
    submittedCode?: true
    language?: true
    verdict?: true
    score?: true
    judge0Token?: true
    submittedAt?: true
    completedAt?: true
  }

  export type CodingAttemptMaxAggregateInputType = {
    id?: true
    associateId?: true
    challengeId?: true
    submittedCode?: true
    language?: true
    verdict?: true
    score?: true
    judge0Token?: true
    submittedAt?: true
    completedAt?: true
  }

  export type CodingAttemptCountAggregateInputType = {
    id?: true
    associateId?: true
    challengeId?: true
    submittedCode?: true
    language?: true
    verdict?: true
    visibleTestResults?: true
    hiddenTestResults?: true
    score?: true
    judge0Token?: true
    submittedAt?: true
    completedAt?: true
    _all?: true
  }

  export type CodingAttemptAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingAttempt to aggregate.
     */
    where?: CodingAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingAttempts to fetch.
     */
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CodingAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CodingAttempts
    **/
    _count?: true | CodingAttemptCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CodingAttemptAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CodingAttemptSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CodingAttemptMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CodingAttemptMaxAggregateInputType
  }

  export type GetCodingAttemptAggregateType<T extends CodingAttemptAggregateArgs> = {
        [P in keyof T & keyof AggregateCodingAttempt]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCodingAttempt[P]>
      : GetScalarType<T[P], AggregateCodingAttempt[P]>
  }




  export type CodingAttemptGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingAttemptWhereInput
    orderBy?: CodingAttemptOrderByWithAggregationInput | CodingAttemptOrderByWithAggregationInput[]
    by: CodingAttemptScalarFieldEnum[] | CodingAttemptScalarFieldEnum
    having?: CodingAttemptScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CodingAttemptCountAggregateInputType | true
    _avg?: CodingAttemptAvgAggregateInputType
    _sum?: CodingAttemptSumAggregateInputType
    _min?: CodingAttemptMinAggregateInputType
    _max?: CodingAttemptMaxAggregateInputType
  }

  export type CodingAttemptGroupByOutputType = {
    id: string
    associateId: number
    challengeId: string
    submittedCode: string
    language: string
    verdict: string
    visibleTestResults: JsonValue
    hiddenTestResults: JsonValue
    score: number | null
    judge0Token: string | null
    submittedAt: Date
    completedAt: Date | null
    _count: CodingAttemptCountAggregateOutputType | null
    _avg: CodingAttemptAvgAggregateOutputType | null
    _sum: CodingAttemptSumAggregateOutputType | null
    _min: CodingAttemptMinAggregateOutputType | null
    _max: CodingAttemptMaxAggregateOutputType | null
  }

  type GetCodingAttemptGroupByPayload<T extends CodingAttemptGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CodingAttemptGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CodingAttemptGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CodingAttemptGroupByOutputType[P]>
            : GetScalarType<T[P], CodingAttemptGroupByOutputType[P]>
        }
      >
    >


  export type CodingAttemptSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    challengeId?: boolean
    submittedCode?: boolean
    language?: boolean
    verdict?: boolean
    visibleTestResults?: boolean
    hiddenTestResults?: boolean
    score?: boolean
    judge0Token?: boolean
    submittedAt?: boolean
    completedAt?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
    signal?: boolean | CodingAttempt$signalArgs<ExtArgs>
  }, ExtArgs["result"]["codingAttempt"]>

  export type CodingAttemptSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    challengeId?: boolean
    submittedCode?: boolean
    language?: boolean
    verdict?: boolean
    visibleTestResults?: boolean
    hiddenTestResults?: boolean
    score?: boolean
    judge0Token?: boolean
    submittedAt?: boolean
    completedAt?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingAttempt"]>

  export type CodingAttemptSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    associateId?: boolean
    challengeId?: boolean
    submittedCode?: boolean
    language?: boolean
    verdict?: boolean
    visibleTestResults?: boolean
    hiddenTestResults?: boolean
    score?: boolean
    judge0Token?: boolean
    submittedAt?: boolean
    completedAt?: boolean
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingAttempt"]>

  export type CodingAttemptSelectScalar = {
    id?: boolean
    associateId?: boolean
    challengeId?: boolean
    submittedCode?: boolean
    language?: boolean
    verdict?: boolean
    visibleTestResults?: boolean
    hiddenTestResults?: boolean
    score?: boolean
    judge0Token?: boolean
    submittedAt?: boolean
    completedAt?: boolean
  }

  export type CodingAttemptOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "associateId" | "challengeId" | "submittedCode" | "language" | "verdict" | "visibleTestResults" | "hiddenTestResults" | "score" | "judge0Token" | "submittedAt" | "completedAt", ExtArgs["result"]["codingAttempt"]>
  export type CodingAttemptInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
    signal?: boolean | CodingAttempt$signalArgs<ExtArgs>
  }
  export type CodingAttemptIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }
  export type CodingAttemptIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    associate?: boolean | AssociateDefaultArgs<ExtArgs>
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }

  export type $CodingAttemptPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CodingAttempt"
    objects: {
      associate: Prisma.$AssociatePayload<ExtArgs>
      challenge: Prisma.$CodingChallengePayload<ExtArgs>
      signal: Prisma.$CodingSkillSignalPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      associateId: number
      challengeId: string
      submittedCode: string
      language: string
      verdict: string
      visibleTestResults: Prisma.JsonValue
      hiddenTestResults: Prisma.JsonValue
      score: number | null
      judge0Token: string | null
      submittedAt: Date
      completedAt: Date | null
    }, ExtArgs["result"]["codingAttempt"]>
    composites: {}
  }

  type CodingAttemptGetPayload<S extends boolean | null | undefined | CodingAttemptDefaultArgs> = $Result.GetResult<Prisma.$CodingAttemptPayload, S>

  type CodingAttemptCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CodingAttemptFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CodingAttemptCountAggregateInputType | true
    }

  export interface CodingAttemptDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CodingAttempt'], meta: { name: 'CodingAttempt' } }
    /**
     * Find zero or one CodingAttempt that matches the filter.
     * @param {CodingAttemptFindUniqueArgs} args - Arguments to find a CodingAttempt
     * @example
     * // Get one CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CodingAttemptFindUniqueArgs>(args: SelectSubset<T, CodingAttemptFindUniqueArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CodingAttempt that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CodingAttemptFindUniqueOrThrowArgs} args - Arguments to find a CodingAttempt
     * @example
     * // Get one CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CodingAttemptFindUniqueOrThrowArgs>(args: SelectSubset<T, CodingAttemptFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingAttempt that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptFindFirstArgs} args - Arguments to find a CodingAttempt
     * @example
     * // Get one CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CodingAttemptFindFirstArgs>(args?: SelectSubset<T, CodingAttemptFindFirstArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingAttempt that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptFindFirstOrThrowArgs} args - Arguments to find a CodingAttempt
     * @example
     * // Get one CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CodingAttemptFindFirstOrThrowArgs>(args?: SelectSubset<T, CodingAttemptFindFirstOrThrowArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CodingAttempts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CodingAttempts
     * const codingAttempts = await prisma.codingAttempt.findMany()
     * 
     * // Get first 10 CodingAttempts
     * const codingAttempts = await prisma.codingAttempt.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const codingAttemptWithIdOnly = await prisma.codingAttempt.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CodingAttemptFindManyArgs>(args?: SelectSubset<T, CodingAttemptFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CodingAttempt.
     * @param {CodingAttemptCreateArgs} args - Arguments to create a CodingAttempt.
     * @example
     * // Create one CodingAttempt
     * const CodingAttempt = await prisma.codingAttempt.create({
     *   data: {
     *     // ... data to create a CodingAttempt
     *   }
     * })
     * 
     */
    create<T extends CodingAttemptCreateArgs>(args: SelectSubset<T, CodingAttemptCreateArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CodingAttempts.
     * @param {CodingAttemptCreateManyArgs} args - Arguments to create many CodingAttempts.
     * @example
     * // Create many CodingAttempts
     * const codingAttempt = await prisma.codingAttempt.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CodingAttemptCreateManyArgs>(args?: SelectSubset<T, CodingAttemptCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CodingAttempts and returns the data saved in the database.
     * @param {CodingAttemptCreateManyAndReturnArgs} args - Arguments to create many CodingAttempts.
     * @example
     * // Create many CodingAttempts
     * const codingAttempt = await prisma.codingAttempt.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CodingAttempts and only return the `id`
     * const codingAttemptWithIdOnly = await prisma.codingAttempt.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CodingAttemptCreateManyAndReturnArgs>(args?: SelectSubset<T, CodingAttemptCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CodingAttempt.
     * @param {CodingAttemptDeleteArgs} args - Arguments to delete one CodingAttempt.
     * @example
     * // Delete one CodingAttempt
     * const CodingAttempt = await prisma.codingAttempt.delete({
     *   where: {
     *     // ... filter to delete one CodingAttempt
     *   }
     * })
     * 
     */
    delete<T extends CodingAttemptDeleteArgs>(args: SelectSubset<T, CodingAttemptDeleteArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CodingAttempt.
     * @param {CodingAttemptUpdateArgs} args - Arguments to update one CodingAttempt.
     * @example
     * // Update one CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CodingAttemptUpdateArgs>(args: SelectSubset<T, CodingAttemptUpdateArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CodingAttempts.
     * @param {CodingAttemptDeleteManyArgs} args - Arguments to filter CodingAttempts to delete.
     * @example
     * // Delete a few CodingAttempts
     * const { count } = await prisma.codingAttempt.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CodingAttemptDeleteManyArgs>(args?: SelectSubset<T, CodingAttemptDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingAttempts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CodingAttempts
     * const codingAttempt = await prisma.codingAttempt.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CodingAttemptUpdateManyArgs>(args: SelectSubset<T, CodingAttemptUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingAttempts and returns the data updated in the database.
     * @param {CodingAttemptUpdateManyAndReturnArgs} args - Arguments to update many CodingAttempts.
     * @example
     * // Update many CodingAttempts
     * const codingAttempt = await prisma.codingAttempt.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CodingAttempts and only return the `id`
     * const codingAttemptWithIdOnly = await prisma.codingAttempt.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CodingAttemptUpdateManyAndReturnArgs>(args: SelectSubset<T, CodingAttemptUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CodingAttempt.
     * @param {CodingAttemptUpsertArgs} args - Arguments to update or create a CodingAttempt.
     * @example
     * // Update or create a CodingAttempt
     * const codingAttempt = await prisma.codingAttempt.upsert({
     *   create: {
     *     // ... data to create a CodingAttempt
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CodingAttempt we want to update
     *   }
     * })
     */
    upsert<T extends CodingAttemptUpsertArgs>(args: SelectSubset<T, CodingAttemptUpsertArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CodingAttempts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptCountArgs} args - Arguments to filter CodingAttempts to count.
     * @example
     * // Count the number of CodingAttempts
     * const count = await prisma.codingAttempt.count({
     *   where: {
     *     // ... the filter for the CodingAttempts we want to count
     *   }
     * })
    **/
    count<T extends CodingAttemptCountArgs>(
      args?: Subset<T, CodingAttemptCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CodingAttemptCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CodingAttempt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CodingAttemptAggregateArgs>(args: Subset<T, CodingAttemptAggregateArgs>): Prisma.PrismaPromise<GetCodingAttemptAggregateType<T>>

    /**
     * Group by CodingAttempt.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingAttemptGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CodingAttemptGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CodingAttemptGroupByArgs['orderBy'] }
        : { orderBy?: CodingAttemptGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CodingAttemptGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCodingAttemptGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CodingAttempt model
   */
  readonly fields: CodingAttemptFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CodingAttempt.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CodingAttemptClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    associate<T extends AssociateDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AssociateDefaultArgs<ExtArgs>>): Prisma__AssociateClient<$Result.GetResult<Prisma.$AssociatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    challenge<T extends CodingChallengeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CodingChallengeDefaultArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    signal<T extends CodingAttempt$signalArgs<ExtArgs> = {}>(args?: Subset<T, CodingAttempt$signalArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CodingAttempt model
   */
  interface CodingAttemptFieldRefs {
    readonly id: FieldRef<"CodingAttempt", 'String'>
    readonly associateId: FieldRef<"CodingAttempt", 'Int'>
    readonly challengeId: FieldRef<"CodingAttempt", 'String'>
    readonly submittedCode: FieldRef<"CodingAttempt", 'String'>
    readonly language: FieldRef<"CodingAttempt", 'String'>
    readonly verdict: FieldRef<"CodingAttempt", 'String'>
    readonly visibleTestResults: FieldRef<"CodingAttempt", 'Json'>
    readonly hiddenTestResults: FieldRef<"CodingAttempt", 'Json'>
    readonly score: FieldRef<"CodingAttempt", 'Float'>
    readonly judge0Token: FieldRef<"CodingAttempt", 'String'>
    readonly submittedAt: FieldRef<"CodingAttempt", 'DateTime'>
    readonly completedAt: FieldRef<"CodingAttempt", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CodingAttempt findUnique
   */
  export type CodingAttemptFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter, which CodingAttempt to fetch.
     */
    where: CodingAttemptWhereUniqueInput
  }

  /**
   * CodingAttempt findUniqueOrThrow
   */
  export type CodingAttemptFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter, which CodingAttempt to fetch.
     */
    where: CodingAttemptWhereUniqueInput
  }

  /**
   * CodingAttempt findFirst
   */
  export type CodingAttemptFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter, which CodingAttempt to fetch.
     */
    where?: CodingAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingAttempts to fetch.
     */
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingAttempts.
     */
    cursor?: CodingAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingAttempts.
     */
    distinct?: CodingAttemptScalarFieldEnum | CodingAttemptScalarFieldEnum[]
  }

  /**
   * CodingAttempt findFirstOrThrow
   */
  export type CodingAttemptFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter, which CodingAttempt to fetch.
     */
    where?: CodingAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingAttempts to fetch.
     */
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingAttempts.
     */
    cursor?: CodingAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingAttempts.
     */
    distinct?: CodingAttemptScalarFieldEnum | CodingAttemptScalarFieldEnum[]
  }

  /**
   * CodingAttempt findMany
   */
  export type CodingAttemptFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter, which CodingAttempts to fetch.
     */
    where?: CodingAttemptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingAttempts to fetch.
     */
    orderBy?: CodingAttemptOrderByWithRelationInput | CodingAttemptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CodingAttempts.
     */
    cursor?: CodingAttemptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingAttempts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingAttempts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingAttempts.
     */
    distinct?: CodingAttemptScalarFieldEnum | CodingAttemptScalarFieldEnum[]
  }

  /**
   * CodingAttempt create
   */
  export type CodingAttemptCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * The data needed to create a CodingAttempt.
     */
    data: XOR<CodingAttemptCreateInput, CodingAttemptUncheckedCreateInput>
  }

  /**
   * CodingAttempt createMany
   */
  export type CodingAttemptCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CodingAttempts.
     */
    data: CodingAttemptCreateManyInput | CodingAttemptCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CodingAttempt createManyAndReturn
   */
  export type CodingAttemptCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * The data used to create many CodingAttempts.
     */
    data: CodingAttemptCreateManyInput | CodingAttemptCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingAttempt update
   */
  export type CodingAttemptUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * The data needed to update a CodingAttempt.
     */
    data: XOR<CodingAttemptUpdateInput, CodingAttemptUncheckedUpdateInput>
    /**
     * Choose, which CodingAttempt to update.
     */
    where: CodingAttemptWhereUniqueInput
  }

  /**
   * CodingAttempt updateMany
   */
  export type CodingAttemptUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CodingAttempts.
     */
    data: XOR<CodingAttemptUpdateManyMutationInput, CodingAttemptUncheckedUpdateManyInput>
    /**
     * Filter which CodingAttempts to update
     */
    where?: CodingAttemptWhereInput
    /**
     * Limit how many CodingAttempts to update.
     */
    limit?: number
  }

  /**
   * CodingAttempt updateManyAndReturn
   */
  export type CodingAttemptUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * The data used to update CodingAttempts.
     */
    data: XOR<CodingAttemptUpdateManyMutationInput, CodingAttemptUncheckedUpdateManyInput>
    /**
     * Filter which CodingAttempts to update
     */
    where?: CodingAttemptWhereInput
    /**
     * Limit how many CodingAttempts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingAttempt upsert
   */
  export type CodingAttemptUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * The filter to search for the CodingAttempt to update in case it exists.
     */
    where: CodingAttemptWhereUniqueInput
    /**
     * In case the CodingAttempt found by the `where` argument doesn't exist, create a new CodingAttempt with this data.
     */
    create: XOR<CodingAttemptCreateInput, CodingAttemptUncheckedCreateInput>
    /**
     * In case the CodingAttempt was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CodingAttemptUpdateInput, CodingAttemptUncheckedUpdateInput>
  }

  /**
   * CodingAttempt delete
   */
  export type CodingAttemptDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
    /**
     * Filter which CodingAttempt to delete.
     */
    where: CodingAttemptWhereUniqueInput
  }

  /**
   * CodingAttempt deleteMany
   */
  export type CodingAttemptDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingAttempts to delete
     */
    where?: CodingAttemptWhereInput
    /**
     * Limit how many CodingAttempts to delete.
     */
    limit?: number
  }

  /**
   * CodingAttempt.signal
   */
  export type CodingAttempt$signalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    where?: CodingSkillSignalWhereInput
  }

  /**
   * CodingAttempt without action
   */
  export type CodingAttemptDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingAttempt
     */
    select?: CodingAttemptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingAttempt
     */
    omit?: CodingAttemptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingAttemptInclude<ExtArgs> | null
  }


  /**
   * Model CodingTestCase
   */

  export type AggregateCodingTestCase = {
    _count: CodingTestCaseCountAggregateOutputType | null
    _avg: CodingTestCaseAvgAggregateOutputType | null
    _sum: CodingTestCaseSumAggregateOutputType | null
    _min: CodingTestCaseMinAggregateOutputType | null
    _max: CodingTestCaseMaxAggregateOutputType | null
  }

  export type CodingTestCaseAvgAggregateOutputType = {
    weight: number | null
    orderIndex: number | null
  }

  export type CodingTestCaseSumAggregateOutputType = {
    weight: number | null
    orderIndex: number | null
  }

  export type CodingTestCaseMinAggregateOutputType = {
    id: string | null
    challengeId: string | null
    isHidden: boolean | null
    stdin: string | null
    expectedStdout: string | null
    weight: number | null
    orderIndex: number | null
  }

  export type CodingTestCaseMaxAggregateOutputType = {
    id: string | null
    challengeId: string | null
    isHidden: boolean | null
    stdin: string | null
    expectedStdout: string | null
    weight: number | null
    orderIndex: number | null
  }

  export type CodingTestCaseCountAggregateOutputType = {
    id: number
    challengeId: number
    isHidden: number
    stdin: number
    expectedStdout: number
    weight: number
    orderIndex: number
    _all: number
  }


  export type CodingTestCaseAvgAggregateInputType = {
    weight?: true
    orderIndex?: true
  }

  export type CodingTestCaseSumAggregateInputType = {
    weight?: true
    orderIndex?: true
  }

  export type CodingTestCaseMinAggregateInputType = {
    id?: true
    challengeId?: true
    isHidden?: true
    stdin?: true
    expectedStdout?: true
    weight?: true
    orderIndex?: true
  }

  export type CodingTestCaseMaxAggregateInputType = {
    id?: true
    challengeId?: true
    isHidden?: true
    stdin?: true
    expectedStdout?: true
    weight?: true
    orderIndex?: true
  }

  export type CodingTestCaseCountAggregateInputType = {
    id?: true
    challengeId?: true
    isHidden?: true
    stdin?: true
    expectedStdout?: true
    weight?: true
    orderIndex?: true
    _all?: true
  }

  export type CodingTestCaseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingTestCase to aggregate.
     */
    where?: CodingTestCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingTestCases to fetch.
     */
    orderBy?: CodingTestCaseOrderByWithRelationInput | CodingTestCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CodingTestCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingTestCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingTestCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CodingTestCases
    **/
    _count?: true | CodingTestCaseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CodingTestCaseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CodingTestCaseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CodingTestCaseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CodingTestCaseMaxAggregateInputType
  }

  export type GetCodingTestCaseAggregateType<T extends CodingTestCaseAggregateArgs> = {
        [P in keyof T & keyof AggregateCodingTestCase]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCodingTestCase[P]>
      : GetScalarType<T[P], AggregateCodingTestCase[P]>
  }




  export type CodingTestCaseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingTestCaseWhereInput
    orderBy?: CodingTestCaseOrderByWithAggregationInput | CodingTestCaseOrderByWithAggregationInput[]
    by: CodingTestCaseScalarFieldEnum[] | CodingTestCaseScalarFieldEnum
    having?: CodingTestCaseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CodingTestCaseCountAggregateInputType | true
    _avg?: CodingTestCaseAvgAggregateInputType
    _sum?: CodingTestCaseSumAggregateInputType
    _min?: CodingTestCaseMinAggregateInputType
    _max?: CodingTestCaseMaxAggregateInputType
  }

  export type CodingTestCaseGroupByOutputType = {
    id: string
    challengeId: string
    isHidden: boolean
    stdin: string
    expectedStdout: string
    weight: number
    orderIndex: number
    _count: CodingTestCaseCountAggregateOutputType | null
    _avg: CodingTestCaseAvgAggregateOutputType | null
    _sum: CodingTestCaseSumAggregateOutputType | null
    _min: CodingTestCaseMinAggregateOutputType | null
    _max: CodingTestCaseMaxAggregateOutputType | null
  }

  type GetCodingTestCaseGroupByPayload<T extends CodingTestCaseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CodingTestCaseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CodingTestCaseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CodingTestCaseGroupByOutputType[P]>
            : GetScalarType<T[P], CodingTestCaseGroupByOutputType[P]>
        }
      >
    >


  export type CodingTestCaseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    challengeId?: boolean
    isHidden?: boolean
    stdin?: boolean
    expectedStdout?: boolean
    weight?: boolean
    orderIndex?: boolean
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingTestCase"]>

  export type CodingTestCaseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    challengeId?: boolean
    isHidden?: boolean
    stdin?: boolean
    expectedStdout?: boolean
    weight?: boolean
    orderIndex?: boolean
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingTestCase"]>

  export type CodingTestCaseSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    challengeId?: boolean
    isHidden?: boolean
    stdin?: boolean
    expectedStdout?: boolean
    weight?: boolean
    orderIndex?: boolean
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingTestCase"]>

  export type CodingTestCaseSelectScalar = {
    id?: boolean
    challengeId?: boolean
    isHidden?: boolean
    stdin?: boolean
    expectedStdout?: boolean
    weight?: boolean
    orderIndex?: boolean
  }

  export type CodingTestCaseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "challengeId" | "isHidden" | "stdin" | "expectedStdout" | "weight" | "orderIndex", ExtArgs["result"]["codingTestCase"]>
  export type CodingTestCaseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }
  export type CodingTestCaseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }
  export type CodingTestCaseIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    challenge?: boolean | CodingChallengeDefaultArgs<ExtArgs>
  }

  export type $CodingTestCasePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CodingTestCase"
    objects: {
      challenge: Prisma.$CodingChallengePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      challengeId: string
      isHidden: boolean
      stdin: string
      expectedStdout: string
      weight: number
      orderIndex: number
    }, ExtArgs["result"]["codingTestCase"]>
    composites: {}
  }

  type CodingTestCaseGetPayload<S extends boolean | null | undefined | CodingTestCaseDefaultArgs> = $Result.GetResult<Prisma.$CodingTestCasePayload, S>

  type CodingTestCaseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CodingTestCaseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CodingTestCaseCountAggregateInputType | true
    }

  export interface CodingTestCaseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CodingTestCase'], meta: { name: 'CodingTestCase' } }
    /**
     * Find zero or one CodingTestCase that matches the filter.
     * @param {CodingTestCaseFindUniqueArgs} args - Arguments to find a CodingTestCase
     * @example
     * // Get one CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CodingTestCaseFindUniqueArgs>(args: SelectSubset<T, CodingTestCaseFindUniqueArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CodingTestCase that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CodingTestCaseFindUniqueOrThrowArgs} args - Arguments to find a CodingTestCase
     * @example
     * // Get one CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CodingTestCaseFindUniqueOrThrowArgs>(args: SelectSubset<T, CodingTestCaseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingTestCase that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseFindFirstArgs} args - Arguments to find a CodingTestCase
     * @example
     * // Get one CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CodingTestCaseFindFirstArgs>(args?: SelectSubset<T, CodingTestCaseFindFirstArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingTestCase that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseFindFirstOrThrowArgs} args - Arguments to find a CodingTestCase
     * @example
     * // Get one CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CodingTestCaseFindFirstOrThrowArgs>(args?: SelectSubset<T, CodingTestCaseFindFirstOrThrowArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CodingTestCases that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CodingTestCases
     * const codingTestCases = await prisma.codingTestCase.findMany()
     * 
     * // Get first 10 CodingTestCases
     * const codingTestCases = await prisma.codingTestCase.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const codingTestCaseWithIdOnly = await prisma.codingTestCase.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CodingTestCaseFindManyArgs>(args?: SelectSubset<T, CodingTestCaseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CodingTestCase.
     * @param {CodingTestCaseCreateArgs} args - Arguments to create a CodingTestCase.
     * @example
     * // Create one CodingTestCase
     * const CodingTestCase = await prisma.codingTestCase.create({
     *   data: {
     *     // ... data to create a CodingTestCase
     *   }
     * })
     * 
     */
    create<T extends CodingTestCaseCreateArgs>(args: SelectSubset<T, CodingTestCaseCreateArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CodingTestCases.
     * @param {CodingTestCaseCreateManyArgs} args - Arguments to create many CodingTestCases.
     * @example
     * // Create many CodingTestCases
     * const codingTestCase = await prisma.codingTestCase.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CodingTestCaseCreateManyArgs>(args?: SelectSubset<T, CodingTestCaseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CodingTestCases and returns the data saved in the database.
     * @param {CodingTestCaseCreateManyAndReturnArgs} args - Arguments to create many CodingTestCases.
     * @example
     * // Create many CodingTestCases
     * const codingTestCase = await prisma.codingTestCase.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CodingTestCases and only return the `id`
     * const codingTestCaseWithIdOnly = await prisma.codingTestCase.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CodingTestCaseCreateManyAndReturnArgs>(args?: SelectSubset<T, CodingTestCaseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CodingTestCase.
     * @param {CodingTestCaseDeleteArgs} args - Arguments to delete one CodingTestCase.
     * @example
     * // Delete one CodingTestCase
     * const CodingTestCase = await prisma.codingTestCase.delete({
     *   where: {
     *     // ... filter to delete one CodingTestCase
     *   }
     * })
     * 
     */
    delete<T extends CodingTestCaseDeleteArgs>(args: SelectSubset<T, CodingTestCaseDeleteArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CodingTestCase.
     * @param {CodingTestCaseUpdateArgs} args - Arguments to update one CodingTestCase.
     * @example
     * // Update one CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CodingTestCaseUpdateArgs>(args: SelectSubset<T, CodingTestCaseUpdateArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CodingTestCases.
     * @param {CodingTestCaseDeleteManyArgs} args - Arguments to filter CodingTestCases to delete.
     * @example
     * // Delete a few CodingTestCases
     * const { count } = await prisma.codingTestCase.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CodingTestCaseDeleteManyArgs>(args?: SelectSubset<T, CodingTestCaseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingTestCases.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CodingTestCases
     * const codingTestCase = await prisma.codingTestCase.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CodingTestCaseUpdateManyArgs>(args: SelectSubset<T, CodingTestCaseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingTestCases and returns the data updated in the database.
     * @param {CodingTestCaseUpdateManyAndReturnArgs} args - Arguments to update many CodingTestCases.
     * @example
     * // Update many CodingTestCases
     * const codingTestCase = await prisma.codingTestCase.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CodingTestCases and only return the `id`
     * const codingTestCaseWithIdOnly = await prisma.codingTestCase.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CodingTestCaseUpdateManyAndReturnArgs>(args: SelectSubset<T, CodingTestCaseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CodingTestCase.
     * @param {CodingTestCaseUpsertArgs} args - Arguments to update or create a CodingTestCase.
     * @example
     * // Update or create a CodingTestCase
     * const codingTestCase = await prisma.codingTestCase.upsert({
     *   create: {
     *     // ... data to create a CodingTestCase
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CodingTestCase we want to update
     *   }
     * })
     */
    upsert<T extends CodingTestCaseUpsertArgs>(args: SelectSubset<T, CodingTestCaseUpsertArgs<ExtArgs>>): Prisma__CodingTestCaseClient<$Result.GetResult<Prisma.$CodingTestCasePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CodingTestCases.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseCountArgs} args - Arguments to filter CodingTestCases to count.
     * @example
     * // Count the number of CodingTestCases
     * const count = await prisma.codingTestCase.count({
     *   where: {
     *     // ... the filter for the CodingTestCases we want to count
     *   }
     * })
    **/
    count<T extends CodingTestCaseCountArgs>(
      args?: Subset<T, CodingTestCaseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CodingTestCaseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CodingTestCase.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CodingTestCaseAggregateArgs>(args: Subset<T, CodingTestCaseAggregateArgs>): Prisma.PrismaPromise<GetCodingTestCaseAggregateType<T>>

    /**
     * Group by CodingTestCase.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingTestCaseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CodingTestCaseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CodingTestCaseGroupByArgs['orderBy'] }
        : { orderBy?: CodingTestCaseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CodingTestCaseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCodingTestCaseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CodingTestCase model
   */
  readonly fields: CodingTestCaseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CodingTestCase.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CodingTestCaseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    challenge<T extends CodingChallengeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CodingChallengeDefaultArgs<ExtArgs>>): Prisma__CodingChallengeClient<$Result.GetResult<Prisma.$CodingChallengePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CodingTestCase model
   */
  interface CodingTestCaseFieldRefs {
    readonly id: FieldRef<"CodingTestCase", 'String'>
    readonly challengeId: FieldRef<"CodingTestCase", 'String'>
    readonly isHidden: FieldRef<"CodingTestCase", 'Boolean'>
    readonly stdin: FieldRef<"CodingTestCase", 'String'>
    readonly expectedStdout: FieldRef<"CodingTestCase", 'String'>
    readonly weight: FieldRef<"CodingTestCase", 'Float'>
    readonly orderIndex: FieldRef<"CodingTestCase", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * CodingTestCase findUnique
   */
  export type CodingTestCaseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter, which CodingTestCase to fetch.
     */
    where: CodingTestCaseWhereUniqueInput
  }

  /**
   * CodingTestCase findUniqueOrThrow
   */
  export type CodingTestCaseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter, which CodingTestCase to fetch.
     */
    where: CodingTestCaseWhereUniqueInput
  }

  /**
   * CodingTestCase findFirst
   */
  export type CodingTestCaseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter, which CodingTestCase to fetch.
     */
    where?: CodingTestCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingTestCases to fetch.
     */
    orderBy?: CodingTestCaseOrderByWithRelationInput | CodingTestCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingTestCases.
     */
    cursor?: CodingTestCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingTestCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingTestCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingTestCases.
     */
    distinct?: CodingTestCaseScalarFieldEnum | CodingTestCaseScalarFieldEnum[]
  }

  /**
   * CodingTestCase findFirstOrThrow
   */
  export type CodingTestCaseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter, which CodingTestCase to fetch.
     */
    where?: CodingTestCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingTestCases to fetch.
     */
    orderBy?: CodingTestCaseOrderByWithRelationInput | CodingTestCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingTestCases.
     */
    cursor?: CodingTestCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingTestCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingTestCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingTestCases.
     */
    distinct?: CodingTestCaseScalarFieldEnum | CodingTestCaseScalarFieldEnum[]
  }

  /**
   * CodingTestCase findMany
   */
  export type CodingTestCaseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter, which CodingTestCases to fetch.
     */
    where?: CodingTestCaseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingTestCases to fetch.
     */
    orderBy?: CodingTestCaseOrderByWithRelationInput | CodingTestCaseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CodingTestCases.
     */
    cursor?: CodingTestCaseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingTestCases from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingTestCases.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingTestCases.
     */
    distinct?: CodingTestCaseScalarFieldEnum | CodingTestCaseScalarFieldEnum[]
  }

  /**
   * CodingTestCase create
   */
  export type CodingTestCaseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * The data needed to create a CodingTestCase.
     */
    data: XOR<CodingTestCaseCreateInput, CodingTestCaseUncheckedCreateInput>
  }

  /**
   * CodingTestCase createMany
   */
  export type CodingTestCaseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CodingTestCases.
     */
    data: CodingTestCaseCreateManyInput | CodingTestCaseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CodingTestCase createManyAndReturn
   */
  export type CodingTestCaseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * The data used to create many CodingTestCases.
     */
    data: CodingTestCaseCreateManyInput | CodingTestCaseCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingTestCase update
   */
  export type CodingTestCaseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * The data needed to update a CodingTestCase.
     */
    data: XOR<CodingTestCaseUpdateInput, CodingTestCaseUncheckedUpdateInput>
    /**
     * Choose, which CodingTestCase to update.
     */
    where: CodingTestCaseWhereUniqueInput
  }

  /**
   * CodingTestCase updateMany
   */
  export type CodingTestCaseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CodingTestCases.
     */
    data: XOR<CodingTestCaseUpdateManyMutationInput, CodingTestCaseUncheckedUpdateManyInput>
    /**
     * Filter which CodingTestCases to update
     */
    where?: CodingTestCaseWhereInput
    /**
     * Limit how many CodingTestCases to update.
     */
    limit?: number
  }

  /**
   * CodingTestCase updateManyAndReturn
   */
  export type CodingTestCaseUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * The data used to update CodingTestCases.
     */
    data: XOR<CodingTestCaseUpdateManyMutationInput, CodingTestCaseUncheckedUpdateManyInput>
    /**
     * Filter which CodingTestCases to update
     */
    where?: CodingTestCaseWhereInput
    /**
     * Limit how many CodingTestCases to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingTestCase upsert
   */
  export type CodingTestCaseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * The filter to search for the CodingTestCase to update in case it exists.
     */
    where: CodingTestCaseWhereUniqueInput
    /**
     * In case the CodingTestCase found by the `where` argument doesn't exist, create a new CodingTestCase with this data.
     */
    create: XOR<CodingTestCaseCreateInput, CodingTestCaseUncheckedCreateInput>
    /**
     * In case the CodingTestCase was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CodingTestCaseUpdateInput, CodingTestCaseUncheckedUpdateInput>
  }

  /**
   * CodingTestCase delete
   */
  export type CodingTestCaseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
    /**
     * Filter which CodingTestCase to delete.
     */
    where: CodingTestCaseWhereUniqueInput
  }

  /**
   * CodingTestCase deleteMany
   */
  export type CodingTestCaseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingTestCases to delete
     */
    where?: CodingTestCaseWhereInput
    /**
     * Limit how many CodingTestCases to delete.
     */
    limit?: number
  }

  /**
   * CodingTestCase without action
   */
  export type CodingTestCaseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingTestCase
     */
    select?: CodingTestCaseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingTestCase
     */
    omit?: CodingTestCaseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingTestCaseInclude<ExtArgs> | null
  }


  /**
   * Model CodingSkillSignal
   */

  export type AggregateCodingSkillSignal = {
    _count: CodingSkillSignalCountAggregateOutputType | null
    _avg: CodingSkillSignalAvgAggregateOutputType | null
    _sum: CodingSkillSignalSumAggregateOutputType | null
    _min: CodingSkillSignalMinAggregateOutputType | null
    _max: CodingSkillSignalMaxAggregateOutputType | null
  }

  export type CodingSkillSignalAvgAggregateOutputType = {
    weight: number | null
    mappedScore: number | null
  }

  export type CodingSkillSignalSumAggregateOutputType = {
    weight: number | null
    mappedScore: number | null
  }

  export type CodingSkillSignalMinAggregateOutputType = {
    id: string | null
    attemptId: string | null
    skillSlug: string | null
    signalType: string | null
    weight: number | null
    mappedScore: number | null
  }

  export type CodingSkillSignalMaxAggregateOutputType = {
    id: string | null
    attemptId: string | null
    skillSlug: string | null
    signalType: string | null
    weight: number | null
    mappedScore: number | null
  }

  export type CodingSkillSignalCountAggregateOutputType = {
    id: number
    attemptId: number
    skillSlug: number
    signalType: number
    weight: number
    mappedScore: number
    _all: number
  }


  export type CodingSkillSignalAvgAggregateInputType = {
    weight?: true
    mappedScore?: true
  }

  export type CodingSkillSignalSumAggregateInputType = {
    weight?: true
    mappedScore?: true
  }

  export type CodingSkillSignalMinAggregateInputType = {
    id?: true
    attemptId?: true
    skillSlug?: true
    signalType?: true
    weight?: true
    mappedScore?: true
  }

  export type CodingSkillSignalMaxAggregateInputType = {
    id?: true
    attemptId?: true
    skillSlug?: true
    signalType?: true
    weight?: true
    mappedScore?: true
  }

  export type CodingSkillSignalCountAggregateInputType = {
    id?: true
    attemptId?: true
    skillSlug?: true
    signalType?: true
    weight?: true
    mappedScore?: true
    _all?: true
  }

  export type CodingSkillSignalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingSkillSignal to aggregate.
     */
    where?: CodingSkillSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingSkillSignals to fetch.
     */
    orderBy?: CodingSkillSignalOrderByWithRelationInput | CodingSkillSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CodingSkillSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingSkillSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingSkillSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CodingSkillSignals
    **/
    _count?: true | CodingSkillSignalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CodingSkillSignalAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CodingSkillSignalSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CodingSkillSignalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CodingSkillSignalMaxAggregateInputType
  }

  export type GetCodingSkillSignalAggregateType<T extends CodingSkillSignalAggregateArgs> = {
        [P in keyof T & keyof AggregateCodingSkillSignal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCodingSkillSignal[P]>
      : GetScalarType<T[P], AggregateCodingSkillSignal[P]>
  }




  export type CodingSkillSignalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CodingSkillSignalWhereInput
    orderBy?: CodingSkillSignalOrderByWithAggregationInput | CodingSkillSignalOrderByWithAggregationInput[]
    by: CodingSkillSignalScalarFieldEnum[] | CodingSkillSignalScalarFieldEnum
    having?: CodingSkillSignalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CodingSkillSignalCountAggregateInputType | true
    _avg?: CodingSkillSignalAvgAggregateInputType
    _sum?: CodingSkillSignalSumAggregateInputType
    _min?: CodingSkillSignalMinAggregateInputType
    _max?: CodingSkillSignalMaxAggregateInputType
  }

  export type CodingSkillSignalGroupByOutputType = {
    id: string
    attemptId: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
    _count: CodingSkillSignalCountAggregateOutputType | null
    _avg: CodingSkillSignalAvgAggregateOutputType | null
    _sum: CodingSkillSignalSumAggregateOutputType | null
    _min: CodingSkillSignalMinAggregateOutputType | null
    _max: CodingSkillSignalMaxAggregateOutputType | null
  }

  type GetCodingSkillSignalGroupByPayload<T extends CodingSkillSignalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CodingSkillSignalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CodingSkillSignalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CodingSkillSignalGroupByOutputType[P]>
            : GetScalarType<T[P], CodingSkillSignalGroupByOutputType[P]>
        }
      >
    >


  export type CodingSkillSignalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    attemptId?: boolean
    skillSlug?: boolean
    signalType?: boolean
    weight?: boolean
    mappedScore?: boolean
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingSkillSignal"]>

  export type CodingSkillSignalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    attemptId?: boolean
    skillSlug?: boolean
    signalType?: boolean
    weight?: boolean
    mappedScore?: boolean
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingSkillSignal"]>

  export type CodingSkillSignalSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    attemptId?: boolean
    skillSlug?: boolean
    signalType?: boolean
    weight?: boolean
    mappedScore?: boolean
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["codingSkillSignal"]>

  export type CodingSkillSignalSelectScalar = {
    id?: boolean
    attemptId?: boolean
    skillSlug?: boolean
    signalType?: boolean
    weight?: boolean
    mappedScore?: boolean
  }

  export type CodingSkillSignalOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "attemptId" | "skillSlug" | "signalType" | "weight" | "mappedScore", ExtArgs["result"]["codingSkillSignal"]>
  export type CodingSkillSignalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }
  export type CodingSkillSignalIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }
  export type CodingSkillSignalIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attempt?: boolean | CodingAttemptDefaultArgs<ExtArgs>
  }

  export type $CodingSkillSignalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CodingSkillSignal"
    objects: {
      attempt: Prisma.$CodingAttemptPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      attemptId: string
      skillSlug: string
      signalType: string
      weight: number
      mappedScore: number
    }, ExtArgs["result"]["codingSkillSignal"]>
    composites: {}
  }

  type CodingSkillSignalGetPayload<S extends boolean | null | undefined | CodingSkillSignalDefaultArgs> = $Result.GetResult<Prisma.$CodingSkillSignalPayload, S>

  type CodingSkillSignalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CodingSkillSignalFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CodingSkillSignalCountAggregateInputType | true
    }

  export interface CodingSkillSignalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CodingSkillSignal'], meta: { name: 'CodingSkillSignal' } }
    /**
     * Find zero or one CodingSkillSignal that matches the filter.
     * @param {CodingSkillSignalFindUniqueArgs} args - Arguments to find a CodingSkillSignal
     * @example
     * // Get one CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CodingSkillSignalFindUniqueArgs>(args: SelectSubset<T, CodingSkillSignalFindUniqueArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CodingSkillSignal that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CodingSkillSignalFindUniqueOrThrowArgs} args - Arguments to find a CodingSkillSignal
     * @example
     * // Get one CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CodingSkillSignalFindUniqueOrThrowArgs>(args: SelectSubset<T, CodingSkillSignalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingSkillSignal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalFindFirstArgs} args - Arguments to find a CodingSkillSignal
     * @example
     * // Get one CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CodingSkillSignalFindFirstArgs>(args?: SelectSubset<T, CodingSkillSignalFindFirstArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CodingSkillSignal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalFindFirstOrThrowArgs} args - Arguments to find a CodingSkillSignal
     * @example
     * // Get one CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CodingSkillSignalFindFirstOrThrowArgs>(args?: SelectSubset<T, CodingSkillSignalFindFirstOrThrowArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CodingSkillSignals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CodingSkillSignals
     * const codingSkillSignals = await prisma.codingSkillSignal.findMany()
     * 
     * // Get first 10 CodingSkillSignals
     * const codingSkillSignals = await prisma.codingSkillSignal.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const codingSkillSignalWithIdOnly = await prisma.codingSkillSignal.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CodingSkillSignalFindManyArgs>(args?: SelectSubset<T, CodingSkillSignalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CodingSkillSignal.
     * @param {CodingSkillSignalCreateArgs} args - Arguments to create a CodingSkillSignal.
     * @example
     * // Create one CodingSkillSignal
     * const CodingSkillSignal = await prisma.codingSkillSignal.create({
     *   data: {
     *     // ... data to create a CodingSkillSignal
     *   }
     * })
     * 
     */
    create<T extends CodingSkillSignalCreateArgs>(args: SelectSubset<T, CodingSkillSignalCreateArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CodingSkillSignals.
     * @param {CodingSkillSignalCreateManyArgs} args - Arguments to create many CodingSkillSignals.
     * @example
     * // Create many CodingSkillSignals
     * const codingSkillSignal = await prisma.codingSkillSignal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CodingSkillSignalCreateManyArgs>(args?: SelectSubset<T, CodingSkillSignalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CodingSkillSignals and returns the data saved in the database.
     * @param {CodingSkillSignalCreateManyAndReturnArgs} args - Arguments to create many CodingSkillSignals.
     * @example
     * // Create many CodingSkillSignals
     * const codingSkillSignal = await prisma.codingSkillSignal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CodingSkillSignals and only return the `id`
     * const codingSkillSignalWithIdOnly = await prisma.codingSkillSignal.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CodingSkillSignalCreateManyAndReturnArgs>(args?: SelectSubset<T, CodingSkillSignalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CodingSkillSignal.
     * @param {CodingSkillSignalDeleteArgs} args - Arguments to delete one CodingSkillSignal.
     * @example
     * // Delete one CodingSkillSignal
     * const CodingSkillSignal = await prisma.codingSkillSignal.delete({
     *   where: {
     *     // ... filter to delete one CodingSkillSignal
     *   }
     * })
     * 
     */
    delete<T extends CodingSkillSignalDeleteArgs>(args: SelectSubset<T, CodingSkillSignalDeleteArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CodingSkillSignal.
     * @param {CodingSkillSignalUpdateArgs} args - Arguments to update one CodingSkillSignal.
     * @example
     * // Update one CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CodingSkillSignalUpdateArgs>(args: SelectSubset<T, CodingSkillSignalUpdateArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CodingSkillSignals.
     * @param {CodingSkillSignalDeleteManyArgs} args - Arguments to filter CodingSkillSignals to delete.
     * @example
     * // Delete a few CodingSkillSignals
     * const { count } = await prisma.codingSkillSignal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CodingSkillSignalDeleteManyArgs>(args?: SelectSubset<T, CodingSkillSignalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingSkillSignals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CodingSkillSignals
     * const codingSkillSignal = await prisma.codingSkillSignal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CodingSkillSignalUpdateManyArgs>(args: SelectSubset<T, CodingSkillSignalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CodingSkillSignals and returns the data updated in the database.
     * @param {CodingSkillSignalUpdateManyAndReturnArgs} args - Arguments to update many CodingSkillSignals.
     * @example
     * // Update many CodingSkillSignals
     * const codingSkillSignal = await prisma.codingSkillSignal.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CodingSkillSignals and only return the `id`
     * const codingSkillSignalWithIdOnly = await prisma.codingSkillSignal.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CodingSkillSignalUpdateManyAndReturnArgs>(args: SelectSubset<T, CodingSkillSignalUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CodingSkillSignal.
     * @param {CodingSkillSignalUpsertArgs} args - Arguments to update or create a CodingSkillSignal.
     * @example
     * // Update or create a CodingSkillSignal
     * const codingSkillSignal = await prisma.codingSkillSignal.upsert({
     *   create: {
     *     // ... data to create a CodingSkillSignal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CodingSkillSignal we want to update
     *   }
     * })
     */
    upsert<T extends CodingSkillSignalUpsertArgs>(args: SelectSubset<T, CodingSkillSignalUpsertArgs<ExtArgs>>): Prisma__CodingSkillSignalClient<$Result.GetResult<Prisma.$CodingSkillSignalPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CodingSkillSignals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalCountArgs} args - Arguments to filter CodingSkillSignals to count.
     * @example
     * // Count the number of CodingSkillSignals
     * const count = await prisma.codingSkillSignal.count({
     *   where: {
     *     // ... the filter for the CodingSkillSignals we want to count
     *   }
     * })
    **/
    count<T extends CodingSkillSignalCountArgs>(
      args?: Subset<T, CodingSkillSignalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CodingSkillSignalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CodingSkillSignal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CodingSkillSignalAggregateArgs>(args: Subset<T, CodingSkillSignalAggregateArgs>): Prisma.PrismaPromise<GetCodingSkillSignalAggregateType<T>>

    /**
     * Group by CodingSkillSignal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CodingSkillSignalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CodingSkillSignalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CodingSkillSignalGroupByArgs['orderBy'] }
        : { orderBy?: CodingSkillSignalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CodingSkillSignalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCodingSkillSignalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CodingSkillSignal model
   */
  readonly fields: CodingSkillSignalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CodingSkillSignal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CodingSkillSignalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    attempt<T extends CodingAttemptDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CodingAttemptDefaultArgs<ExtArgs>>): Prisma__CodingAttemptClient<$Result.GetResult<Prisma.$CodingAttemptPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CodingSkillSignal model
   */
  interface CodingSkillSignalFieldRefs {
    readonly id: FieldRef<"CodingSkillSignal", 'String'>
    readonly attemptId: FieldRef<"CodingSkillSignal", 'String'>
    readonly skillSlug: FieldRef<"CodingSkillSignal", 'String'>
    readonly signalType: FieldRef<"CodingSkillSignal", 'String'>
    readonly weight: FieldRef<"CodingSkillSignal", 'Float'>
    readonly mappedScore: FieldRef<"CodingSkillSignal", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * CodingSkillSignal findUnique
   */
  export type CodingSkillSignalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter, which CodingSkillSignal to fetch.
     */
    where: CodingSkillSignalWhereUniqueInput
  }

  /**
   * CodingSkillSignal findUniqueOrThrow
   */
  export type CodingSkillSignalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter, which CodingSkillSignal to fetch.
     */
    where: CodingSkillSignalWhereUniqueInput
  }

  /**
   * CodingSkillSignal findFirst
   */
  export type CodingSkillSignalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter, which CodingSkillSignal to fetch.
     */
    where?: CodingSkillSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingSkillSignals to fetch.
     */
    orderBy?: CodingSkillSignalOrderByWithRelationInput | CodingSkillSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingSkillSignals.
     */
    cursor?: CodingSkillSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingSkillSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingSkillSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingSkillSignals.
     */
    distinct?: CodingSkillSignalScalarFieldEnum | CodingSkillSignalScalarFieldEnum[]
  }

  /**
   * CodingSkillSignal findFirstOrThrow
   */
  export type CodingSkillSignalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter, which CodingSkillSignal to fetch.
     */
    where?: CodingSkillSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingSkillSignals to fetch.
     */
    orderBy?: CodingSkillSignalOrderByWithRelationInput | CodingSkillSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CodingSkillSignals.
     */
    cursor?: CodingSkillSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingSkillSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingSkillSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingSkillSignals.
     */
    distinct?: CodingSkillSignalScalarFieldEnum | CodingSkillSignalScalarFieldEnum[]
  }

  /**
   * CodingSkillSignal findMany
   */
  export type CodingSkillSignalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter, which CodingSkillSignals to fetch.
     */
    where?: CodingSkillSignalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CodingSkillSignals to fetch.
     */
    orderBy?: CodingSkillSignalOrderByWithRelationInput | CodingSkillSignalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CodingSkillSignals.
     */
    cursor?: CodingSkillSignalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CodingSkillSignals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CodingSkillSignals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CodingSkillSignals.
     */
    distinct?: CodingSkillSignalScalarFieldEnum | CodingSkillSignalScalarFieldEnum[]
  }

  /**
   * CodingSkillSignal create
   */
  export type CodingSkillSignalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * The data needed to create a CodingSkillSignal.
     */
    data: XOR<CodingSkillSignalCreateInput, CodingSkillSignalUncheckedCreateInput>
  }

  /**
   * CodingSkillSignal createMany
   */
  export type CodingSkillSignalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CodingSkillSignals.
     */
    data: CodingSkillSignalCreateManyInput | CodingSkillSignalCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CodingSkillSignal createManyAndReturn
   */
  export type CodingSkillSignalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * The data used to create many CodingSkillSignals.
     */
    data: CodingSkillSignalCreateManyInput | CodingSkillSignalCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingSkillSignal update
   */
  export type CodingSkillSignalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * The data needed to update a CodingSkillSignal.
     */
    data: XOR<CodingSkillSignalUpdateInput, CodingSkillSignalUncheckedUpdateInput>
    /**
     * Choose, which CodingSkillSignal to update.
     */
    where: CodingSkillSignalWhereUniqueInput
  }

  /**
   * CodingSkillSignal updateMany
   */
  export type CodingSkillSignalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CodingSkillSignals.
     */
    data: XOR<CodingSkillSignalUpdateManyMutationInput, CodingSkillSignalUncheckedUpdateManyInput>
    /**
     * Filter which CodingSkillSignals to update
     */
    where?: CodingSkillSignalWhereInput
    /**
     * Limit how many CodingSkillSignals to update.
     */
    limit?: number
  }

  /**
   * CodingSkillSignal updateManyAndReturn
   */
  export type CodingSkillSignalUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * The data used to update CodingSkillSignals.
     */
    data: XOR<CodingSkillSignalUpdateManyMutationInput, CodingSkillSignalUncheckedUpdateManyInput>
    /**
     * Filter which CodingSkillSignals to update
     */
    where?: CodingSkillSignalWhereInput
    /**
     * Limit how many CodingSkillSignals to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CodingSkillSignal upsert
   */
  export type CodingSkillSignalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * The filter to search for the CodingSkillSignal to update in case it exists.
     */
    where: CodingSkillSignalWhereUniqueInput
    /**
     * In case the CodingSkillSignal found by the `where` argument doesn't exist, create a new CodingSkillSignal with this data.
     */
    create: XOR<CodingSkillSignalCreateInput, CodingSkillSignalUncheckedCreateInput>
    /**
     * In case the CodingSkillSignal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CodingSkillSignalUpdateInput, CodingSkillSignalUncheckedUpdateInput>
  }

  /**
   * CodingSkillSignal delete
   */
  export type CodingSkillSignalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
    /**
     * Filter which CodingSkillSignal to delete.
     */
    where: CodingSkillSignalWhereUniqueInput
  }

  /**
   * CodingSkillSignal deleteMany
   */
  export type CodingSkillSignalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CodingSkillSignals to delete
     */
    where?: CodingSkillSignalWhereInput
    /**
     * Limit how many CodingSkillSignals to delete.
     */
    limit?: number
  }

  /**
   * CodingSkillSignal without action
   */
  export type CodingSkillSignalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CodingSkillSignal
     */
    select?: CodingSkillSignalSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CodingSkillSignal
     */
    omit?: CodingSkillSignalOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CodingSkillSignalInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const HealthCheckScalarFieldEnum: {
    id: 'id',
    createdAt: 'createdAt'
  };

  export type HealthCheckScalarFieldEnum = (typeof HealthCheckScalarFieldEnum)[keyof typeof HealthCheckScalarFieldEnum]


  export const AssociateScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    displayName: 'displayName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    readinessStatus: 'readinessStatus',
    recommendedArea: 'recommendedArea',
    lastComputedAt: 'lastComputedAt',
    email: 'email',
    authUserId: 'authUserId',
    lastInvitedAt: 'lastInvitedAt',
    cohortId: 'cohortId'
  };

  export type AssociateScalarFieldEnum = (typeof AssociateScalarFieldEnum)[keyof typeof AssociateScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    candidateName: 'candidateName',
    interviewerName: 'interviewerName',
    date: 'date',
    status: 'status',
    questionCount: 'questionCount',
    selectedWeeks: 'selectedWeeks',
    overallTechnicalScore: 'overallTechnicalScore',
    overallSoftSkillScore: 'overallSoftSkillScore',
    technicalFeedback: 'technicalFeedback',
    softSkillFeedback: 'softSkillFeedback',
    questions: 'questions',
    starterQuestions: 'starterQuestions',
    assessments: 'assessments',
    techMap: 'techMap',
    associateId: 'associateId',
    cohortId: 'cohortId',
    aiTrainerVariance: 'aiTrainerVariance',
    mode: 'mode',
    readinessRecomputeStatus: 'readinessRecomputeStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const GapScoreScalarFieldEnum: {
    id: 'id',
    associateId: 'associateId',
    skill: 'skill',
    topic: 'topic',
    weightedScore: 'weightedScore',
    prevWeightedScore: 'prevWeightedScore',
    sessionCount: 'sessionCount',
    lastUpdated: 'lastUpdated'
  };

  export type GapScoreScalarFieldEnum = (typeof GapScoreScalarFieldEnum)[keyof typeof GapScoreScalarFieldEnum]


  export const SettingsScalarFieldEnum: {
    id: 'id',
    readinessThreshold: 'readinessThreshold',
    updatedAt: 'updatedAt'
  };

  export type SettingsScalarFieldEnum = (typeof SettingsScalarFieldEnum)[keyof typeof SettingsScalarFieldEnum]


  export const CohortScalarFieldEnum: {
    id: 'id',
    name: 'name',
    startDate: 'startDate',
    endDate: 'endDate',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CohortScalarFieldEnum = (typeof CohortScalarFieldEnum)[keyof typeof CohortScalarFieldEnum]


  export const CurriculumWeekScalarFieldEnum: {
    id: 'id',
    cohortId: 'cohortId',
    weekNumber: 'weekNumber',
    skillName: 'skillName',
    skillSlug: 'skillSlug',
    topicTags: 'topicTags',
    startDate: 'startDate'
  };

  export type CurriculumWeekScalarFieldEnum = (typeof CurriculumWeekScalarFieldEnum)[keyof typeof CurriculumWeekScalarFieldEnum]


  export const ProfileScalarFieldEnum: {
    id: 'id',
    authUserId: 'authUserId',
    displayName: 'displayName',
    githubUsername: 'githubUsername',
    bio: 'bio',
    learningGoals: 'learningGoals',
    passwordSetAt: 'passwordSetAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProfileScalarFieldEnum = (typeof ProfileScalarFieldEnum)[keyof typeof ProfileScalarFieldEnum]


  export const AuthEventScalarFieldEnum: {
    id: 'id',
    type: 'type',
    email: 'email',
    ip: 'ip',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type AuthEventScalarFieldEnum = (typeof AuthEventScalarFieldEnum)[keyof typeof AuthEventScalarFieldEnum]


  export const CodingChallengeScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    language: 'language',
    difficulty: 'difficulty',
    description: 'description',
    skillSlug: 'skillSlug',
    cohortId: 'cohortId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CodingChallengeScalarFieldEnum = (typeof CodingChallengeScalarFieldEnum)[keyof typeof CodingChallengeScalarFieldEnum]


  export const CodingAttemptScalarFieldEnum: {
    id: 'id',
    associateId: 'associateId',
    challengeId: 'challengeId',
    submittedCode: 'submittedCode',
    language: 'language',
    verdict: 'verdict',
    visibleTestResults: 'visibleTestResults',
    hiddenTestResults: 'hiddenTestResults',
    score: 'score',
    judge0Token: 'judge0Token',
    submittedAt: 'submittedAt',
    completedAt: 'completedAt'
  };

  export type CodingAttemptScalarFieldEnum = (typeof CodingAttemptScalarFieldEnum)[keyof typeof CodingAttemptScalarFieldEnum]


  export const CodingTestCaseScalarFieldEnum: {
    id: 'id',
    challengeId: 'challengeId',
    isHidden: 'isHidden',
    stdin: 'stdin',
    expectedStdout: 'expectedStdout',
    weight: 'weight',
    orderIndex: 'orderIndex'
  };

  export type CodingTestCaseScalarFieldEnum = (typeof CodingTestCaseScalarFieldEnum)[keyof typeof CodingTestCaseScalarFieldEnum]


  export const CodingSkillSignalScalarFieldEnum: {
    id: 'id',
    attemptId: 'attemptId',
    skillSlug: 'skillSlug',
    signalType: 'signalType',
    weight: 'weight',
    mappedScore: 'mappedScore'
  };

  export type CodingSkillSignalScalarFieldEnum = (typeof CodingSkillSignalScalarFieldEnum)[keyof typeof CodingSkillSignalScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    
  /**
   * Deep Input Types
   */


  export type HealthCheckWhereInput = {
    AND?: HealthCheckWhereInput | HealthCheckWhereInput[]
    OR?: HealthCheckWhereInput[]
    NOT?: HealthCheckWhereInput | HealthCheckWhereInput[]
    id?: IntFilter<"HealthCheck"> | number
    createdAt?: DateTimeFilter<"HealthCheck"> | Date | string
  }

  export type HealthCheckOrderByWithRelationInput = {
    id?: SortOrder
    createdAt?: SortOrder
  }

  export type HealthCheckWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: HealthCheckWhereInput | HealthCheckWhereInput[]
    OR?: HealthCheckWhereInput[]
    NOT?: HealthCheckWhereInput | HealthCheckWhereInput[]
    createdAt?: DateTimeFilter<"HealthCheck"> | Date | string
  }, "id">

  export type HealthCheckOrderByWithAggregationInput = {
    id?: SortOrder
    createdAt?: SortOrder
    _count?: HealthCheckCountOrderByAggregateInput
    _avg?: HealthCheckAvgOrderByAggregateInput
    _max?: HealthCheckMaxOrderByAggregateInput
    _min?: HealthCheckMinOrderByAggregateInput
    _sum?: HealthCheckSumOrderByAggregateInput
  }

  export type HealthCheckScalarWhereWithAggregatesInput = {
    AND?: HealthCheckScalarWhereWithAggregatesInput | HealthCheckScalarWhereWithAggregatesInput[]
    OR?: HealthCheckScalarWhereWithAggregatesInput[]
    NOT?: HealthCheckScalarWhereWithAggregatesInput | HealthCheckScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"HealthCheck"> | number
    createdAt?: DateTimeWithAggregatesFilter<"HealthCheck"> | Date | string
  }

  export type AssociateWhereInput = {
    AND?: AssociateWhereInput | AssociateWhereInput[]
    OR?: AssociateWhereInput[]
    NOT?: AssociateWhereInput | AssociateWhereInput[]
    id?: IntFilter<"Associate"> | number
    slug?: StringFilter<"Associate"> | string
    displayName?: StringNullableFilter<"Associate"> | string | null
    createdAt?: DateTimeFilter<"Associate"> | Date | string
    updatedAt?: DateTimeFilter<"Associate"> | Date | string
    readinessStatus?: StringNullableFilter<"Associate"> | string | null
    recommendedArea?: StringNullableFilter<"Associate"> | string | null
    lastComputedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    email?: StringNullableFilter<"Associate"> | string | null
    authUserId?: StringNullableFilter<"Associate"> | string | null
    lastInvitedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    cohortId?: IntNullableFilter<"Associate"> | number | null
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
    sessions?: SessionListRelationFilter
    gapScores?: GapScoreListRelationFilter
    codingAttempts?: CodingAttemptListRelationFilter
  }

  export type AssociateOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    displayName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    readinessStatus?: SortOrderInput | SortOrder
    recommendedArea?: SortOrderInput | SortOrder
    lastComputedAt?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    authUserId?: SortOrderInput | SortOrder
    lastInvitedAt?: SortOrderInput | SortOrder
    cohortId?: SortOrderInput | SortOrder
    cohort?: CohortOrderByWithRelationInput
    sessions?: SessionOrderByRelationAggregateInput
    gapScores?: GapScoreOrderByRelationAggregateInput
    codingAttempts?: CodingAttemptOrderByRelationAggregateInput
  }

  export type AssociateWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    slug?: string
    email?: string
    authUserId?: string
    AND?: AssociateWhereInput | AssociateWhereInput[]
    OR?: AssociateWhereInput[]
    NOT?: AssociateWhereInput | AssociateWhereInput[]
    displayName?: StringNullableFilter<"Associate"> | string | null
    createdAt?: DateTimeFilter<"Associate"> | Date | string
    updatedAt?: DateTimeFilter<"Associate"> | Date | string
    readinessStatus?: StringNullableFilter<"Associate"> | string | null
    recommendedArea?: StringNullableFilter<"Associate"> | string | null
    lastComputedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    lastInvitedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    cohortId?: IntNullableFilter<"Associate"> | number | null
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
    sessions?: SessionListRelationFilter
    gapScores?: GapScoreListRelationFilter
    codingAttempts?: CodingAttemptListRelationFilter
  }, "id" | "slug" | "email" | "authUserId">

  export type AssociateOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    displayName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    readinessStatus?: SortOrderInput | SortOrder
    recommendedArea?: SortOrderInput | SortOrder
    lastComputedAt?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    authUserId?: SortOrderInput | SortOrder
    lastInvitedAt?: SortOrderInput | SortOrder
    cohortId?: SortOrderInput | SortOrder
    _count?: AssociateCountOrderByAggregateInput
    _avg?: AssociateAvgOrderByAggregateInput
    _max?: AssociateMaxOrderByAggregateInput
    _min?: AssociateMinOrderByAggregateInput
    _sum?: AssociateSumOrderByAggregateInput
  }

  export type AssociateScalarWhereWithAggregatesInput = {
    AND?: AssociateScalarWhereWithAggregatesInput | AssociateScalarWhereWithAggregatesInput[]
    OR?: AssociateScalarWhereWithAggregatesInput[]
    NOT?: AssociateScalarWhereWithAggregatesInput | AssociateScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Associate"> | number
    slug?: StringWithAggregatesFilter<"Associate"> | string
    displayName?: StringNullableWithAggregatesFilter<"Associate"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Associate"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Associate"> | Date | string
    readinessStatus?: StringNullableWithAggregatesFilter<"Associate"> | string | null
    recommendedArea?: StringNullableWithAggregatesFilter<"Associate"> | string | null
    lastComputedAt?: DateTimeNullableWithAggregatesFilter<"Associate"> | Date | string | null
    email?: StringNullableWithAggregatesFilter<"Associate"> | string | null
    authUserId?: StringNullableWithAggregatesFilter<"Associate"> | string | null
    lastInvitedAt?: DateTimeNullableWithAggregatesFilter<"Associate"> | Date | string | null
    cohortId?: IntNullableWithAggregatesFilter<"Associate"> | number | null
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    candidateName?: StringNullableFilter<"Session"> | string | null
    interviewerName?: StringNullableFilter<"Session"> | string | null
    date?: StringFilter<"Session"> | string
    status?: StringFilter<"Session"> | string
    questionCount?: IntFilter<"Session"> | number
    selectedWeeks?: JsonFilter<"Session">
    overallTechnicalScore?: FloatNullableFilter<"Session"> | number | null
    overallSoftSkillScore?: FloatNullableFilter<"Session"> | number | null
    technicalFeedback?: StringNullableFilter<"Session"> | string | null
    softSkillFeedback?: StringNullableFilter<"Session"> | string | null
    questions?: JsonFilter<"Session">
    starterQuestions?: JsonFilter<"Session">
    assessments?: JsonFilter<"Session">
    techMap?: JsonNullableFilter<"Session">
    associateId?: IntNullableFilter<"Session"> | number | null
    cohortId?: IntNullableFilter<"Session"> | number | null
    aiTrainerVariance?: FloatNullableFilter<"Session"> | number | null
    mode?: StringFilter<"Session"> | string
    readinessRecomputeStatus?: StringFilter<"Session"> | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    associate?: XOR<AssociateNullableScalarRelationFilter, AssociateWhereInput> | null
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    candidateName?: SortOrderInput | SortOrder
    interviewerName?: SortOrderInput | SortOrder
    date?: SortOrder
    status?: SortOrder
    questionCount?: SortOrder
    selectedWeeks?: SortOrder
    overallTechnicalScore?: SortOrderInput | SortOrder
    overallSoftSkillScore?: SortOrderInput | SortOrder
    technicalFeedback?: SortOrderInput | SortOrder
    softSkillFeedback?: SortOrderInput | SortOrder
    questions?: SortOrder
    starterQuestions?: SortOrder
    assessments?: SortOrder
    techMap?: SortOrderInput | SortOrder
    associateId?: SortOrderInput | SortOrder
    cohortId?: SortOrderInput | SortOrder
    aiTrainerVariance?: SortOrderInput | SortOrder
    mode?: SortOrder
    readinessRecomputeStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    associate?: AssociateOrderByWithRelationInput
    cohort?: CohortOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    candidateName?: StringNullableFilter<"Session"> | string | null
    interviewerName?: StringNullableFilter<"Session"> | string | null
    date?: StringFilter<"Session"> | string
    status?: StringFilter<"Session"> | string
    questionCount?: IntFilter<"Session"> | number
    selectedWeeks?: JsonFilter<"Session">
    overallTechnicalScore?: FloatNullableFilter<"Session"> | number | null
    overallSoftSkillScore?: FloatNullableFilter<"Session"> | number | null
    technicalFeedback?: StringNullableFilter<"Session"> | string | null
    softSkillFeedback?: StringNullableFilter<"Session"> | string | null
    questions?: JsonFilter<"Session">
    starterQuestions?: JsonFilter<"Session">
    assessments?: JsonFilter<"Session">
    techMap?: JsonNullableFilter<"Session">
    associateId?: IntNullableFilter<"Session"> | number | null
    cohortId?: IntNullableFilter<"Session"> | number | null
    aiTrainerVariance?: FloatNullableFilter<"Session"> | number | null
    mode?: StringFilter<"Session"> | string
    readinessRecomputeStatus?: StringFilter<"Session"> | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    associate?: XOR<AssociateNullableScalarRelationFilter, AssociateWhereInput> | null
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
  }, "id">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    candidateName?: SortOrderInput | SortOrder
    interviewerName?: SortOrderInput | SortOrder
    date?: SortOrder
    status?: SortOrder
    questionCount?: SortOrder
    selectedWeeks?: SortOrder
    overallTechnicalScore?: SortOrderInput | SortOrder
    overallSoftSkillScore?: SortOrderInput | SortOrder
    technicalFeedback?: SortOrderInput | SortOrder
    softSkillFeedback?: SortOrderInput | SortOrder
    questions?: SortOrder
    starterQuestions?: SortOrder
    assessments?: SortOrder
    techMap?: SortOrderInput | SortOrder
    associateId?: SortOrderInput | SortOrder
    cohortId?: SortOrderInput | SortOrder
    aiTrainerVariance?: SortOrderInput | SortOrder
    mode?: SortOrder
    readinessRecomputeStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _avg?: SessionAvgOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
    _sum?: SessionSumOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    candidateName?: StringNullableWithAggregatesFilter<"Session"> | string | null
    interviewerName?: StringNullableWithAggregatesFilter<"Session"> | string | null
    date?: StringWithAggregatesFilter<"Session"> | string
    status?: StringWithAggregatesFilter<"Session"> | string
    questionCount?: IntWithAggregatesFilter<"Session"> | number
    selectedWeeks?: JsonWithAggregatesFilter<"Session">
    overallTechnicalScore?: FloatNullableWithAggregatesFilter<"Session"> | number | null
    overallSoftSkillScore?: FloatNullableWithAggregatesFilter<"Session"> | number | null
    technicalFeedback?: StringNullableWithAggregatesFilter<"Session"> | string | null
    softSkillFeedback?: StringNullableWithAggregatesFilter<"Session"> | string | null
    questions?: JsonWithAggregatesFilter<"Session">
    starterQuestions?: JsonWithAggregatesFilter<"Session">
    assessments?: JsonWithAggregatesFilter<"Session">
    techMap?: JsonNullableWithAggregatesFilter<"Session">
    associateId?: IntNullableWithAggregatesFilter<"Session"> | number | null
    cohortId?: IntNullableWithAggregatesFilter<"Session"> | number | null
    aiTrainerVariance?: FloatNullableWithAggregatesFilter<"Session"> | number | null
    mode?: StringWithAggregatesFilter<"Session"> | string
    readinessRecomputeStatus?: StringWithAggregatesFilter<"Session"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type GapScoreWhereInput = {
    AND?: GapScoreWhereInput | GapScoreWhereInput[]
    OR?: GapScoreWhereInput[]
    NOT?: GapScoreWhereInput | GapScoreWhereInput[]
    id?: StringFilter<"GapScore"> | string
    associateId?: IntFilter<"GapScore"> | number
    skill?: StringFilter<"GapScore"> | string
    topic?: StringFilter<"GapScore"> | string
    weightedScore?: FloatFilter<"GapScore"> | number
    prevWeightedScore?: FloatNullableFilter<"GapScore"> | number | null
    sessionCount?: IntFilter<"GapScore"> | number
    lastUpdated?: DateTimeFilter<"GapScore"> | Date | string
    associate?: XOR<AssociateScalarRelationFilter, AssociateWhereInput>
  }

  export type GapScoreOrderByWithRelationInput = {
    id?: SortOrder
    associateId?: SortOrder
    skill?: SortOrder
    topic?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrderInput | SortOrder
    sessionCount?: SortOrder
    lastUpdated?: SortOrder
    associate?: AssociateOrderByWithRelationInput
  }

  export type GapScoreWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    associateId_skill_topic?: GapScoreAssociateIdSkillTopicCompoundUniqueInput
    AND?: GapScoreWhereInput | GapScoreWhereInput[]
    OR?: GapScoreWhereInput[]
    NOT?: GapScoreWhereInput | GapScoreWhereInput[]
    associateId?: IntFilter<"GapScore"> | number
    skill?: StringFilter<"GapScore"> | string
    topic?: StringFilter<"GapScore"> | string
    weightedScore?: FloatFilter<"GapScore"> | number
    prevWeightedScore?: FloatNullableFilter<"GapScore"> | number | null
    sessionCount?: IntFilter<"GapScore"> | number
    lastUpdated?: DateTimeFilter<"GapScore"> | Date | string
    associate?: XOR<AssociateScalarRelationFilter, AssociateWhereInput>
  }, "id" | "associateId_skill_topic">

  export type GapScoreOrderByWithAggregationInput = {
    id?: SortOrder
    associateId?: SortOrder
    skill?: SortOrder
    topic?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrderInput | SortOrder
    sessionCount?: SortOrder
    lastUpdated?: SortOrder
    _count?: GapScoreCountOrderByAggregateInput
    _avg?: GapScoreAvgOrderByAggregateInput
    _max?: GapScoreMaxOrderByAggregateInput
    _min?: GapScoreMinOrderByAggregateInput
    _sum?: GapScoreSumOrderByAggregateInput
  }

  export type GapScoreScalarWhereWithAggregatesInput = {
    AND?: GapScoreScalarWhereWithAggregatesInput | GapScoreScalarWhereWithAggregatesInput[]
    OR?: GapScoreScalarWhereWithAggregatesInput[]
    NOT?: GapScoreScalarWhereWithAggregatesInput | GapScoreScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"GapScore"> | string
    associateId?: IntWithAggregatesFilter<"GapScore"> | number
    skill?: StringWithAggregatesFilter<"GapScore"> | string
    topic?: StringWithAggregatesFilter<"GapScore"> | string
    weightedScore?: FloatWithAggregatesFilter<"GapScore"> | number
    prevWeightedScore?: FloatNullableWithAggregatesFilter<"GapScore"> | number | null
    sessionCount?: IntWithAggregatesFilter<"GapScore"> | number
    lastUpdated?: DateTimeWithAggregatesFilter<"GapScore"> | Date | string
  }

  export type SettingsWhereInput = {
    AND?: SettingsWhereInput | SettingsWhereInput[]
    OR?: SettingsWhereInput[]
    NOT?: SettingsWhereInput | SettingsWhereInput[]
    id?: IntFilter<"Settings"> | number
    readinessThreshold?: FloatFilter<"Settings"> | number
    updatedAt?: DateTimeFilter<"Settings"> | Date | string
  }

  export type SettingsOrderByWithRelationInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: SettingsWhereInput | SettingsWhereInput[]
    OR?: SettingsWhereInput[]
    NOT?: SettingsWhereInput | SettingsWhereInput[]
    readinessThreshold?: FloatFilter<"Settings"> | number
    updatedAt?: DateTimeFilter<"Settings"> | Date | string
  }, "id">

  export type SettingsOrderByWithAggregationInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
    updatedAt?: SortOrder
    _count?: SettingsCountOrderByAggregateInput
    _avg?: SettingsAvgOrderByAggregateInput
    _max?: SettingsMaxOrderByAggregateInput
    _min?: SettingsMinOrderByAggregateInput
    _sum?: SettingsSumOrderByAggregateInput
  }

  export type SettingsScalarWhereWithAggregatesInput = {
    AND?: SettingsScalarWhereWithAggregatesInput | SettingsScalarWhereWithAggregatesInput[]
    OR?: SettingsScalarWhereWithAggregatesInput[]
    NOT?: SettingsScalarWhereWithAggregatesInput | SettingsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Settings"> | number
    readinessThreshold?: FloatWithAggregatesFilter<"Settings"> | number
    updatedAt?: DateTimeWithAggregatesFilter<"Settings"> | Date | string
  }

  export type CohortWhereInput = {
    AND?: CohortWhereInput | CohortWhereInput[]
    OR?: CohortWhereInput[]
    NOT?: CohortWhereInput | CohortWhereInput[]
    id?: IntFilter<"Cohort"> | number
    name?: StringFilter<"Cohort"> | string
    startDate?: DateTimeFilter<"Cohort"> | Date | string
    endDate?: DateTimeNullableFilter<"Cohort"> | Date | string | null
    description?: StringNullableFilter<"Cohort"> | string | null
    createdAt?: DateTimeFilter<"Cohort"> | Date | string
    updatedAt?: DateTimeFilter<"Cohort"> | Date | string
    associates?: AssociateListRelationFilter
    sessions?: SessionListRelationFilter
    curriculumWeeks?: CurriculumWeekListRelationFilter
    codingChallenges?: CodingChallengeListRelationFilter
  }

  export type CohortOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    associates?: AssociateOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
    curriculumWeeks?: CurriculumWeekOrderByRelationAggregateInput
    codingChallenges?: CodingChallengeOrderByRelationAggregateInput
  }

  export type CohortWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: CohortWhereInput | CohortWhereInput[]
    OR?: CohortWhereInput[]
    NOT?: CohortWhereInput | CohortWhereInput[]
    name?: StringFilter<"Cohort"> | string
    startDate?: DateTimeFilter<"Cohort"> | Date | string
    endDate?: DateTimeNullableFilter<"Cohort"> | Date | string | null
    description?: StringNullableFilter<"Cohort"> | string | null
    createdAt?: DateTimeFilter<"Cohort"> | Date | string
    updatedAt?: DateTimeFilter<"Cohort"> | Date | string
    associates?: AssociateListRelationFilter
    sessions?: SessionListRelationFilter
    curriculumWeeks?: CurriculumWeekListRelationFilter
    codingChallenges?: CodingChallengeListRelationFilter
  }, "id">

  export type CohortOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CohortCountOrderByAggregateInput
    _avg?: CohortAvgOrderByAggregateInput
    _max?: CohortMaxOrderByAggregateInput
    _min?: CohortMinOrderByAggregateInput
    _sum?: CohortSumOrderByAggregateInput
  }

  export type CohortScalarWhereWithAggregatesInput = {
    AND?: CohortScalarWhereWithAggregatesInput | CohortScalarWhereWithAggregatesInput[]
    OR?: CohortScalarWhereWithAggregatesInput[]
    NOT?: CohortScalarWhereWithAggregatesInput | CohortScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Cohort"> | number
    name?: StringWithAggregatesFilter<"Cohort"> | string
    startDate?: DateTimeWithAggregatesFilter<"Cohort"> | Date | string
    endDate?: DateTimeNullableWithAggregatesFilter<"Cohort"> | Date | string | null
    description?: StringNullableWithAggregatesFilter<"Cohort"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Cohort"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Cohort"> | Date | string
  }

  export type CurriculumWeekWhereInput = {
    AND?: CurriculumWeekWhereInput | CurriculumWeekWhereInput[]
    OR?: CurriculumWeekWhereInput[]
    NOT?: CurriculumWeekWhereInput | CurriculumWeekWhereInput[]
    id?: IntFilter<"CurriculumWeek"> | number
    cohortId?: IntFilter<"CurriculumWeek"> | number
    weekNumber?: IntFilter<"CurriculumWeek"> | number
    skillName?: StringFilter<"CurriculumWeek"> | string
    skillSlug?: StringFilter<"CurriculumWeek"> | string
    topicTags?: StringNullableListFilter<"CurriculumWeek">
    startDate?: DateTimeFilter<"CurriculumWeek"> | Date | string
    cohort?: XOR<CohortScalarRelationFilter, CohortWhereInput>
  }

  export type CurriculumWeekOrderByWithRelationInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
    skillName?: SortOrder
    skillSlug?: SortOrder
    topicTags?: SortOrder
    startDate?: SortOrder
    cohort?: CohortOrderByWithRelationInput
  }

  export type CurriculumWeekWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    cohortId_weekNumber?: CurriculumWeekCohortIdWeekNumberCompoundUniqueInput
    AND?: CurriculumWeekWhereInput | CurriculumWeekWhereInput[]
    OR?: CurriculumWeekWhereInput[]
    NOT?: CurriculumWeekWhereInput | CurriculumWeekWhereInput[]
    cohortId?: IntFilter<"CurriculumWeek"> | number
    weekNumber?: IntFilter<"CurriculumWeek"> | number
    skillName?: StringFilter<"CurriculumWeek"> | string
    skillSlug?: StringFilter<"CurriculumWeek"> | string
    topicTags?: StringNullableListFilter<"CurriculumWeek">
    startDate?: DateTimeFilter<"CurriculumWeek"> | Date | string
    cohort?: XOR<CohortScalarRelationFilter, CohortWhereInput>
  }, "id" | "cohortId_weekNumber">

  export type CurriculumWeekOrderByWithAggregationInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
    skillName?: SortOrder
    skillSlug?: SortOrder
    topicTags?: SortOrder
    startDate?: SortOrder
    _count?: CurriculumWeekCountOrderByAggregateInput
    _avg?: CurriculumWeekAvgOrderByAggregateInput
    _max?: CurriculumWeekMaxOrderByAggregateInput
    _min?: CurriculumWeekMinOrderByAggregateInput
    _sum?: CurriculumWeekSumOrderByAggregateInput
  }

  export type CurriculumWeekScalarWhereWithAggregatesInput = {
    AND?: CurriculumWeekScalarWhereWithAggregatesInput | CurriculumWeekScalarWhereWithAggregatesInput[]
    OR?: CurriculumWeekScalarWhereWithAggregatesInput[]
    NOT?: CurriculumWeekScalarWhereWithAggregatesInput | CurriculumWeekScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CurriculumWeek"> | number
    cohortId?: IntWithAggregatesFilter<"CurriculumWeek"> | number
    weekNumber?: IntWithAggregatesFilter<"CurriculumWeek"> | number
    skillName?: StringWithAggregatesFilter<"CurriculumWeek"> | string
    skillSlug?: StringWithAggregatesFilter<"CurriculumWeek"> | string
    topicTags?: StringNullableListFilter<"CurriculumWeek">
    startDate?: DateTimeWithAggregatesFilter<"CurriculumWeek"> | Date | string
  }

  export type ProfileWhereInput = {
    AND?: ProfileWhereInput | ProfileWhereInput[]
    OR?: ProfileWhereInput[]
    NOT?: ProfileWhereInput | ProfileWhereInput[]
    id?: IntFilter<"Profile"> | number
    authUserId?: StringFilter<"Profile"> | string
    displayName?: StringNullableFilter<"Profile"> | string | null
    githubUsername?: StringNullableFilter<"Profile"> | string | null
    bio?: StringNullableFilter<"Profile"> | string | null
    learningGoals?: StringNullableFilter<"Profile"> | string | null
    passwordSetAt?: DateTimeNullableFilter<"Profile"> | Date | string | null
    createdAt?: DateTimeFilter<"Profile"> | Date | string
    updatedAt?: DateTimeFilter<"Profile"> | Date | string
  }

  export type ProfileOrderByWithRelationInput = {
    id?: SortOrder
    authUserId?: SortOrder
    displayName?: SortOrderInput | SortOrder
    githubUsername?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    learningGoals?: SortOrderInput | SortOrder
    passwordSetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    authUserId?: string
    AND?: ProfileWhereInput | ProfileWhereInput[]
    OR?: ProfileWhereInput[]
    NOT?: ProfileWhereInput | ProfileWhereInput[]
    displayName?: StringNullableFilter<"Profile"> | string | null
    githubUsername?: StringNullableFilter<"Profile"> | string | null
    bio?: StringNullableFilter<"Profile"> | string | null
    learningGoals?: StringNullableFilter<"Profile"> | string | null
    passwordSetAt?: DateTimeNullableFilter<"Profile"> | Date | string | null
    createdAt?: DateTimeFilter<"Profile"> | Date | string
    updatedAt?: DateTimeFilter<"Profile"> | Date | string
  }, "id" | "authUserId">

  export type ProfileOrderByWithAggregationInput = {
    id?: SortOrder
    authUserId?: SortOrder
    displayName?: SortOrderInput | SortOrder
    githubUsername?: SortOrderInput | SortOrder
    bio?: SortOrderInput | SortOrder
    learningGoals?: SortOrderInput | SortOrder
    passwordSetAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProfileCountOrderByAggregateInput
    _avg?: ProfileAvgOrderByAggregateInput
    _max?: ProfileMaxOrderByAggregateInput
    _min?: ProfileMinOrderByAggregateInput
    _sum?: ProfileSumOrderByAggregateInput
  }

  export type ProfileScalarWhereWithAggregatesInput = {
    AND?: ProfileScalarWhereWithAggregatesInput | ProfileScalarWhereWithAggregatesInput[]
    OR?: ProfileScalarWhereWithAggregatesInput[]
    NOT?: ProfileScalarWhereWithAggregatesInput | ProfileScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Profile"> | number
    authUserId?: StringWithAggregatesFilter<"Profile"> | string
    displayName?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    githubUsername?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    bio?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    learningGoals?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    passwordSetAt?: DateTimeNullableWithAggregatesFilter<"Profile"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Profile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Profile"> | Date | string
  }

  export type AuthEventWhereInput = {
    AND?: AuthEventWhereInput | AuthEventWhereInput[]
    OR?: AuthEventWhereInput[]
    NOT?: AuthEventWhereInput | AuthEventWhereInput[]
    id?: StringFilter<"AuthEvent"> | string
    type?: StringFilter<"AuthEvent"> | string
    email?: StringFilter<"AuthEvent"> | string
    ip?: StringFilter<"AuthEvent"> | string
    metadata?: JsonNullableFilter<"AuthEvent">
    createdAt?: DateTimeFilter<"AuthEvent"> | Date | string
  }

  export type AuthEventOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    email?: SortOrder
    ip?: SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type AuthEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuthEventWhereInput | AuthEventWhereInput[]
    OR?: AuthEventWhereInput[]
    NOT?: AuthEventWhereInput | AuthEventWhereInput[]
    type?: StringFilter<"AuthEvent"> | string
    email?: StringFilter<"AuthEvent"> | string
    ip?: StringFilter<"AuthEvent"> | string
    metadata?: JsonNullableFilter<"AuthEvent">
    createdAt?: DateTimeFilter<"AuthEvent"> | Date | string
  }, "id">

  export type AuthEventOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    email?: SortOrder
    ip?: SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuthEventCountOrderByAggregateInput
    _max?: AuthEventMaxOrderByAggregateInput
    _min?: AuthEventMinOrderByAggregateInput
  }

  export type AuthEventScalarWhereWithAggregatesInput = {
    AND?: AuthEventScalarWhereWithAggregatesInput | AuthEventScalarWhereWithAggregatesInput[]
    OR?: AuthEventScalarWhereWithAggregatesInput[]
    NOT?: AuthEventScalarWhereWithAggregatesInput | AuthEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuthEvent"> | string
    type?: StringWithAggregatesFilter<"AuthEvent"> | string
    email?: StringWithAggregatesFilter<"AuthEvent"> | string
    ip?: StringWithAggregatesFilter<"AuthEvent"> | string
    metadata?: JsonNullableWithAggregatesFilter<"AuthEvent">
    createdAt?: DateTimeWithAggregatesFilter<"AuthEvent"> | Date | string
  }

  export type CodingChallengeWhereInput = {
    AND?: CodingChallengeWhereInput | CodingChallengeWhereInput[]
    OR?: CodingChallengeWhereInput[]
    NOT?: CodingChallengeWhereInput | CodingChallengeWhereInput[]
    id?: StringFilter<"CodingChallenge"> | string
    slug?: StringFilter<"CodingChallenge"> | string
    title?: StringFilter<"CodingChallenge"> | string
    language?: StringFilter<"CodingChallenge"> | string
    difficulty?: StringFilter<"CodingChallenge"> | string
    description?: StringFilter<"CodingChallenge"> | string
    skillSlug?: StringFilter<"CodingChallenge"> | string
    cohortId?: IntNullableFilter<"CodingChallenge"> | number | null
    createdAt?: DateTimeFilter<"CodingChallenge"> | Date | string
    updatedAt?: DateTimeFilter<"CodingChallenge"> | Date | string
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
    attempts?: CodingAttemptListRelationFilter
    testCases?: CodingTestCaseListRelationFilter
  }

  export type CodingChallengeOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    language?: SortOrder
    difficulty?: SortOrder
    description?: SortOrder
    skillSlug?: SortOrder
    cohortId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    cohort?: CohortOrderByWithRelationInput
    attempts?: CodingAttemptOrderByRelationAggregateInput
    testCases?: CodingTestCaseOrderByRelationAggregateInput
  }

  export type CodingChallengeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: CodingChallengeWhereInput | CodingChallengeWhereInput[]
    OR?: CodingChallengeWhereInput[]
    NOT?: CodingChallengeWhereInput | CodingChallengeWhereInput[]
    title?: StringFilter<"CodingChallenge"> | string
    language?: StringFilter<"CodingChallenge"> | string
    difficulty?: StringFilter<"CodingChallenge"> | string
    description?: StringFilter<"CodingChallenge"> | string
    skillSlug?: StringFilter<"CodingChallenge"> | string
    cohortId?: IntNullableFilter<"CodingChallenge"> | number | null
    createdAt?: DateTimeFilter<"CodingChallenge"> | Date | string
    updatedAt?: DateTimeFilter<"CodingChallenge"> | Date | string
    cohort?: XOR<CohortNullableScalarRelationFilter, CohortWhereInput> | null
    attempts?: CodingAttemptListRelationFilter
    testCases?: CodingTestCaseListRelationFilter
  }, "id" | "slug">

  export type CodingChallengeOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    language?: SortOrder
    difficulty?: SortOrder
    description?: SortOrder
    skillSlug?: SortOrder
    cohortId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CodingChallengeCountOrderByAggregateInput
    _avg?: CodingChallengeAvgOrderByAggregateInput
    _max?: CodingChallengeMaxOrderByAggregateInput
    _min?: CodingChallengeMinOrderByAggregateInput
    _sum?: CodingChallengeSumOrderByAggregateInput
  }

  export type CodingChallengeScalarWhereWithAggregatesInput = {
    AND?: CodingChallengeScalarWhereWithAggregatesInput | CodingChallengeScalarWhereWithAggregatesInput[]
    OR?: CodingChallengeScalarWhereWithAggregatesInput[]
    NOT?: CodingChallengeScalarWhereWithAggregatesInput | CodingChallengeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CodingChallenge"> | string
    slug?: StringWithAggregatesFilter<"CodingChallenge"> | string
    title?: StringWithAggregatesFilter<"CodingChallenge"> | string
    language?: StringWithAggregatesFilter<"CodingChallenge"> | string
    difficulty?: StringWithAggregatesFilter<"CodingChallenge"> | string
    description?: StringWithAggregatesFilter<"CodingChallenge"> | string
    skillSlug?: StringWithAggregatesFilter<"CodingChallenge"> | string
    cohortId?: IntNullableWithAggregatesFilter<"CodingChallenge"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"CodingChallenge"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CodingChallenge"> | Date | string
  }

  export type CodingAttemptWhereInput = {
    AND?: CodingAttemptWhereInput | CodingAttemptWhereInput[]
    OR?: CodingAttemptWhereInput[]
    NOT?: CodingAttemptWhereInput | CodingAttemptWhereInput[]
    id?: StringFilter<"CodingAttempt"> | string
    associateId?: IntFilter<"CodingAttempt"> | number
    challengeId?: StringFilter<"CodingAttempt"> | string
    submittedCode?: StringFilter<"CodingAttempt"> | string
    language?: StringFilter<"CodingAttempt"> | string
    verdict?: StringFilter<"CodingAttempt"> | string
    visibleTestResults?: JsonFilter<"CodingAttempt">
    hiddenTestResults?: JsonFilter<"CodingAttempt">
    score?: FloatNullableFilter<"CodingAttempt"> | number | null
    judge0Token?: StringNullableFilter<"CodingAttempt"> | string | null
    submittedAt?: DateTimeFilter<"CodingAttempt"> | Date | string
    completedAt?: DateTimeNullableFilter<"CodingAttempt"> | Date | string | null
    associate?: XOR<AssociateScalarRelationFilter, AssociateWhereInput>
    challenge?: XOR<CodingChallengeScalarRelationFilter, CodingChallengeWhereInput>
    signal?: XOR<CodingSkillSignalNullableScalarRelationFilter, CodingSkillSignalWhereInput> | null
  }

  export type CodingAttemptOrderByWithRelationInput = {
    id?: SortOrder
    associateId?: SortOrder
    challengeId?: SortOrder
    submittedCode?: SortOrder
    language?: SortOrder
    verdict?: SortOrder
    visibleTestResults?: SortOrder
    hiddenTestResults?: SortOrder
    score?: SortOrderInput | SortOrder
    judge0Token?: SortOrderInput | SortOrder
    submittedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    associate?: AssociateOrderByWithRelationInput
    challenge?: CodingChallengeOrderByWithRelationInput
    signal?: CodingSkillSignalOrderByWithRelationInput
  }

  export type CodingAttemptWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CodingAttemptWhereInput | CodingAttemptWhereInput[]
    OR?: CodingAttemptWhereInput[]
    NOT?: CodingAttemptWhereInput | CodingAttemptWhereInput[]
    associateId?: IntFilter<"CodingAttempt"> | number
    challengeId?: StringFilter<"CodingAttempt"> | string
    submittedCode?: StringFilter<"CodingAttempt"> | string
    language?: StringFilter<"CodingAttempt"> | string
    verdict?: StringFilter<"CodingAttempt"> | string
    visibleTestResults?: JsonFilter<"CodingAttempt">
    hiddenTestResults?: JsonFilter<"CodingAttempt">
    score?: FloatNullableFilter<"CodingAttempt"> | number | null
    judge0Token?: StringNullableFilter<"CodingAttempt"> | string | null
    submittedAt?: DateTimeFilter<"CodingAttempt"> | Date | string
    completedAt?: DateTimeNullableFilter<"CodingAttempt"> | Date | string | null
    associate?: XOR<AssociateScalarRelationFilter, AssociateWhereInput>
    challenge?: XOR<CodingChallengeScalarRelationFilter, CodingChallengeWhereInput>
    signal?: XOR<CodingSkillSignalNullableScalarRelationFilter, CodingSkillSignalWhereInput> | null
  }, "id">

  export type CodingAttemptOrderByWithAggregationInput = {
    id?: SortOrder
    associateId?: SortOrder
    challengeId?: SortOrder
    submittedCode?: SortOrder
    language?: SortOrder
    verdict?: SortOrder
    visibleTestResults?: SortOrder
    hiddenTestResults?: SortOrder
    score?: SortOrderInput | SortOrder
    judge0Token?: SortOrderInput | SortOrder
    submittedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    _count?: CodingAttemptCountOrderByAggregateInput
    _avg?: CodingAttemptAvgOrderByAggregateInput
    _max?: CodingAttemptMaxOrderByAggregateInput
    _min?: CodingAttemptMinOrderByAggregateInput
    _sum?: CodingAttemptSumOrderByAggregateInput
  }

  export type CodingAttemptScalarWhereWithAggregatesInput = {
    AND?: CodingAttemptScalarWhereWithAggregatesInput | CodingAttemptScalarWhereWithAggregatesInput[]
    OR?: CodingAttemptScalarWhereWithAggregatesInput[]
    NOT?: CodingAttemptScalarWhereWithAggregatesInput | CodingAttemptScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CodingAttempt"> | string
    associateId?: IntWithAggregatesFilter<"CodingAttempt"> | number
    challengeId?: StringWithAggregatesFilter<"CodingAttempt"> | string
    submittedCode?: StringWithAggregatesFilter<"CodingAttempt"> | string
    language?: StringWithAggregatesFilter<"CodingAttempt"> | string
    verdict?: StringWithAggregatesFilter<"CodingAttempt"> | string
    visibleTestResults?: JsonWithAggregatesFilter<"CodingAttempt">
    hiddenTestResults?: JsonWithAggregatesFilter<"CodingAttempt">
    score?: FloatNullableWithAggregatesFilter<"CodingAttempt"> | number | null
    judge0Token?: StringNullableWithAggregatesFilter<"CodingAttempt"> | string | null
    submittedAt?: DateTimeWithAggregatesFilter<"CodingAttempt"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"CodingAttempt"> | Date | string | null
  }

  export type CodingTestCaseWhereInput = {
    AND?: CodingTestCaseWhereInput | CodingTestCaseWhereInput[]
    OR?: CodingTestCaseWhereInput[]
    NOT?: CodingTestCaseWhereInput | CodingTestCaseWhereInput[]
    id?: StringFilter<"CodingTestCase"> | string
    challengeId?: StringFilter<"CodingTestCase"> | string
    isHidden?: BoolFilter<"CodingTestCase"> | boolean
    stdin?: StringFilter<"CodingTestCase"> | string
    expectedStdout?: StringFilter<"CodingTestCase"> | string
    weight?: FloatFilter<"CodingTestCase"> | number
    orderIndex?: IntFilter<"CodingTestCase"> | number
    challenge?: XOR<CodingChallengeScalarRelationFilter, CodingChallengeWhereInput>
  }

  export type CodingTestCaseOrderByWithRelationInput = {
    id?: SortOrder
    challengeId?: SortOrder
    isHidden?: SortOrder
    stdin?: SortOrder
    expectedStdout?: SortOrder
    weight?: SortOrder
    orderIndex?: SortOrder
    challenge?: CodingChallengeOrderByWithRelationInput
  }

  export type CodingTestCaseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    challengeId_id?: CodingTestCaseChallengeIdIdCompoundUniqueInput
    AND?: CodingTestCaseWhereInput | CodingTestCaseWhereInput[]
    OR?: CodingTestCaseWhereInput[]
    NOT?: CodingTestCaseWhereInput | CodingTestCaseWhereInput[]
    challengeId?: StringFilter<"CodingTestCase"> | string
    isHidden?: BoolFilter<"CodingTestCase"> | boolean
    stdin?: StringFilter<"CodingTestCase"> | string
    expectedStdout?: StringFilter<"CodingTestCase"> | string
    weight?: FloatFilter<"CodingTestCase"> | number
    orderIndex?: IntFilter<"CodingTestCase"> | number
    challenge?: XOR<CodingChallengeScalarRelationFilter, CodingChallengeWhereInput>
  }, "id" | "challengeId_id">

  export type CodingTestCaseOrderByWithAggregationInput = {
    id?: SortOrder
    challengeId?: SortOrder
    isHidden?: SortOrder
    stdin?: SortOrder
    expectedStdout?: SortOrder
    weight?: SortOrder
    orderIndex?: SortOrder
    _count?: CodingTestCaseCountOrderByAggregateInput
    _avg?: CodingTestCaseAvgOrderByAggregateInput
    _max?: CodingTestCaseMaxOrderByAggregateInput
    _min?: CodingTestCaseMinOrderByAggregateInput
    _sum?: CodingTestCaseSumOrderByAggregateInput
  }

  export type CodingTestCaseScalarWhereWithAggregatesInput = {
    AND?: CodingTestCaseScalarWhereWithAggregatesInput | CodingTestCaseScalarWhereWithAggregatesInput[]
    OR?: CodingTestCaseScalarWhereWithAggregatesInput[]
    NOT?: CodingTestCaseScalarWhereWithAggregatesInput | CodingTestCaseScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CodingTestCase"> | string
    challengeId?: StringWithAggregatesFilter<"CodingTestCase"> | string
    isHidden?: BoolWithAggregatesFilter<"CodingTestCase"> | boolean
    stdin?: StringWithAggregatesFilter<"CodingTestCase"> | string
    expectedStdout?: StringWithAggregatesFilter<"CodingTestCase"> | string
    weight?: FloatWithAggregatesFilter<"CodingTestCase"> | number
    orderIndex?: IntWithAggregatesFilter<"CodingTestCase"> | number
  }

  export type CodingSkillSignalWhereInput = {
    AND?: CodingSkillSignalWhereInput | CodingSkillSignalWhereInput[]
    OR?: CodingSkillSignalWhereInput[]
    NOT?: CodingSkillSignalWhereInput | CodingSkillSignalWhereInput[]
    id?: StringFilter<"CodingSkillSignal"> | string
    attemptId?: StringFilter<"CodingSkillSignal"> | string
    skillSlug?: StringFilter<"CodingSkillSignal"> | string
    signalType?: StringFilter<"CodingSkillSignal"> | string
    weight?: FloatFilter<"CodingSkillSignal"> | number
    mappedScore?: FloatFilter<"CodingSkillSignal"> | number
    attempt?: XOR<CodingAttemptScalarRelationFilter, CodingAttemptWhereInput>
  }

  export type CodingSkillSignalOrderByWithRelationInput = {
    id?: SortOrder
    attemptId?: SortOrder
    skillSlug?: SortOrder
    signalType?: SortOrder
    weight?: SortOrder
    mappedScore?: SortOrder
    attempt?: CodingAttemptOrderByWithRelationInput
  }

  export type CodingSkillSignalWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    attemptId?: string
    AND?: CodingSkillSignalWhereInput | CodingSkillSignalWhereInput[]
    OR?: CodingSkillSignalWhereInput[]
    NOT?: CodingSkillSignalWhereInput | CodingSkillSignalWhereInput[]
    skillSlug?: StringFilter<"CodingSkillSignal"> | string
    signalType?: StringFilter<"CodingSkillSignal"> | string
    weight?: FloatFilter<"CodingSkillSignal"> | number
    mappedScore?: FloatFilter<"CodingSkillSignal"> | number
    attempt?: XOR<CodingAttemptScalarRelationFilter, CodingAttemptWhereInput>
  }, "id" | "attemptId">

  export type CodingSkillSignalOrderByWithAggregationInput = {
    id?: SortOrder
    attemptId?: SortOrder
    skillSlug?: SortOrder
    signalType?: SortOrder
    weight?: SortOrder
    mappedScore?: SortOrder
    _count?: CodingSkillSignalCountOrderByAggregateInput
    _avg?: CodingSkillSignalAvgOrderByAggregateInput
    _max?: CodingSkillSignalMaxOrderByAggregateInput
    _min?: CodingSkillSignalMinOrderByAggregateInput
    _sum?: CodingSkillSignalSumOrderByAggregateInput
  }

  export type CodingSkillSignalScalarWhereWithAggregatesInput = {
    AND?: CodingSkillSignalScalarWhereWithAggregatesInput | CodingSkillSignalScalarWhereWithAggregatesInput[]
    OR?: CodingSkillSignalScalarWhereWithAggregatesInput[]
    NOT?: CodingSkillSignalScalarWhereWithAggregatesInput | CodingSkillSignalScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CodingSkillSignal"> | string
    attemptId?: StringWithAggregatesFilter<"CodingSkillSignal"> | string
    skillSlug?: StringWithAggregatesFilter<"CodingSkillSignal"> | string
    signalType?: StringWithAggregatesFilter<"CodingSkillSignal"> | string
    weight?: FloatWithAggregatesFilter<"CodingSkillSignal"> | number
    mappedScore?: FloatWithAggregatesFilter<"CodingSkillSignal"> | number
  }

  export type HealthCheckCreateInput = {
    createdAt?: Date | string
  }

  export type HealthCheckUncheckedCreateInput = {
    id?: number
    createdAt?: Date | string
  }

  export type HealthCheckUpdateInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type HealthCheckUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type HealthCheckCreateManyInput = {
    id?: number
    createdAt?: Date | string
  }

  export type HealthCheckUpdateManyMutationInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type HealthCheckUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssociateCreateInput = {
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohort?: CohortCreateNestedOneWithoutAssociatesInput
    sessions?: SessionCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUncheckedCreateInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohortId?: number | null
    sessions?: SessionUncheckedCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreUncheckedCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptUncheckedCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUpdateInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohort?: CohortUpdateOneWithoutAssociatesNestedInput
    sessions?: SessionUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    sessions?: SessionUncheckedUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUncheckedUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUncheckedUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateCreateManyInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohortId?: number | null
  }

  export type AssociateUpdateManyMutationInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AssociateUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type SessionCreateInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    associate?: AssociateCreateNestedOneWithoutSessionsInput
    cohort?: CohortCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: number | null
    cohortId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associate?: AssociateUpdateOneWithoutSessionsNestedInput
    cohort?: CohortUpdateOneWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: NullableIntFieldUpdateOperationsInput | number | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: number | null
    cohortId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: NullableIntFieldUpdateOperationsInput | number | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreCreateInput = {
    id?: string
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
    associate: AssociateCreateNestedOneWithoutGapScoresInput
  }

  export type GapScoreUncheckedCreateInput = {
    id?: string
    associateId: number
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
  }

  export type GapScoreUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
    associate?: AssociateUpdateOneRequiredWithoutGapScoresNestedInput
  }

  export type GapScoreUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreCreateManyInput = {
    id?: string
    associateId: number
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
  }

  export type GapScoreUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingsCreateInput = {
    id?: number
    readinessThreshold?: number
    updatedAt?: Date | string
  }

  export type SettingsUncheckedCreateInput = {
    id?: number
    readinessThreshold?: number
    updatedAt?: Date | string
  }

  export type SettingsUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    readinessThreshold?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    readinessThreshold?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingsCreateManyInput = {
    id?: number
    readinessThreshold?: number
    updatedAt?: Date | string
  }

  export type SettingsUpdateManyMutationInput = {
    id?: IntFieldUpdateOperationsInput | number
    readinessThreshold?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    readinessThreshold?: FloatFieldUpdateOperationsInput | number
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CohortCreateInput = {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateCreateNestedManyWithoutCohortInput
    sessions?: SessionCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeCreateNestedManyWithoutCohortInput
  }

  export type CohortUncheckedCreateInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateUncheckedCreateNestedManyWithoutCohortInput
    sessions?: SessionUncheckedCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekUncheckedCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeUncheckedCreateNestedManyWithoutCohortInput
  }

  export type CohortUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUpdateManyWithoutCohortNestedInput
    sessions?: SessionUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUpdateManyWithoutCohortNestedInput
  }

  export type CohortUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUncheckedUpdateManyWithoutCohortNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUncheckedUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUncheckedUpdateManyWithoutCohortNestedInput
  }

  export type CohortCreateManyInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CohortUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CohortUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekCreateInput = {
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
    cohort: CohortCreateNestedOneWithoutCurriculumWeeksInput
  }

  export type CurriculumWeekUncheckedCreateInput = {
    id?: number
    cohortId: number
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
  }

  export type CurriculumWeekUpdateInput = {
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    cohort?: CohortUpdateOneRequiredWithoutCurriculumWeeksNestedInput
  }

  export type CurriculumWeekUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    cohortId?: IntFieldUpdateOperationsInput | number
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekCreateManyInput = {
    id?: number
    cohortId: number
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
  }

  export type CurriculumWeekUpdateManyMutationInput = {
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    cohortId?: IntFieldUpdateOperationsInput | number
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileCreateInput = {
    authUserId: string
    displayName?: string | null
    githubUsername?: string | null
    bio?: string | null
    learningGoals?: string | null
    passwordSetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProfileUncheckedCreateInput = {
    id?: number
    authUserId: string
    displayName?: string | null
    githubUsername?: string | null
    bio?: string | null
    learningGoals?: string | null
    passwordSetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProfileUpdateInput = {
    authUserId?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    githubUsername?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    learningGoals?: NullableStringFieldUpdateOperationsInput | string | null
    passwordSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    authUserId?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    githubUsername?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    learningGoals?: NullableStringFieldUpdateOperationsInput | string | null
    passwordSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileCreateManyInput = {
    id?: number
    authUserId: string
    displayName?: string | null
    githubUsername?: string | null
    bio?: string | null
    learningGoals?: string | null
    passwordSetAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProfileUpdateManyMutationInput = {
    authUserId?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    githubUsername?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    learningGoals?: NullableStringFieldUpdateOperationsInput | string | null
    passwordSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    authUserId?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    githubUsername?: NullableStringFieldUpdateOperationsInput | string | null
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    learningGoals?: NullableStringFieldUpdateOperationsInput | string | null
    passwordSetAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthEventCreateInput = {
    id?: string
    type: string
    email: string
    ip: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuthEventUncheckedCreateInput = {
    id?: string
    type: string
    email: string
    ip: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuthEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    ip?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    ip?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthEventCreateManyInput = {
    id?: string
    type: string
    email: string
    ip: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AuthEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    ip?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuthEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    ip?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingChallengeCreateInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cohort?: CohortCreateNestedOneWithoutCodingChallengesInput
    attempts?: CodingAttemptCreateNestedManyWithoutChallengeInput
    testCases?: CodingTestCaseCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    cohortId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attempts?: CodingAttemptUncheckedCreateNestedManyWithoutChallengeInput
    testCases?: CodingTestCaseUncheckedCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cohort?: CohortUpdateOneWithoutCodingChallengesNestedInput
    attempts?: CodingAttemptUpdateManyWithoutChallengeNestedInput
    testCases?: CodingTestCaseUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: CodingAttemptUncheckedUpdateManyWithoutChallengeNestedInput
    testCases?: CodingTestCaseUncheckedUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeCreateManyInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    cohortId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CodingChallengeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingChallengeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingAttemptCreateInput = {
    id?: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    associate: AssociateCreateNestedOneWithoutCodingAttemptsInput
    challenge: CodingChallengeCreateNestedOneWithoutAttemptsInput
    signal?: CodingSkillSignalCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptUncheckedCreateInput = {
    id?: string
    associateId: number
    challengeId: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    signal?: CodingSkillSignalUncheckedCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    associate?: AssociateUpdateOneRequiredWithoutCodingAttemptsNestedInput
    challenge?: CodingChallengeUpdateOneRequiredWithoutAttemptsNestedInput
    signal?: CodingSkillSignalUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    challengeId?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    signal?: CodingSkillSignalUncheckedUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptCreateManyInput = {
    id?: string
    associateId: number
    challengeId: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type CodingAttemptUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CodingAttemptUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    challengeId?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CodingTestCaseCreateInput = {
    id?: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
    challenge: CodingChallengeCreateNestedOneWithoutTestCasesInput
  }

  export type CodingTestCaseUncheckedCreateInput = {
    id?: string
    challengeId: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
  }

  export type CodingTestCaseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
    challenge?: CodingChallengeUpdateOneRequiredWithoutTestCasesNestedInput
  }

  export type CodingTestCaseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    challengeId?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }

  export type CodingTestCaseCreateManyInput = {
    id?: string
    challengeId: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
  }

  export type CodingTestCaseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }

  export type CodingTestCaseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    challengeId?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }

  export type CodingSkillSignalCreateInput = {
    id?: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
    attempt: CodingAttemptCreateNestedOneWithoutSignalInput
  }

  export type CodingSkillSignalUncheckedCreateInput = {
    id?: string
    attemptId: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
  }

  export type CodingSkillSignalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
    attempt?: CodingAttemptUpdateOneRequiredWithoutSignalNestedInput
  }

  export type CodingSkillSignalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    attemptId?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
  }

  export type CodingSkillSignalCreateManyInput = {
    id?: string
    attemptId: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
  }

  export type CodingSkillSignalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
  }

  export type CodingSkillSignalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    attemptId?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type HealthCheckCountOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
  }

  export type HealthCheckAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type HealthCheckMaxOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
  }

  export type HealthCheckMinOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
  }

  export type HealthCheckSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type CohortNullableScalarRelationFilter = {
    is?: CohortWhereInput | null
    isNot?: CohortWhereInput | null
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type GapScoreListRelationFilter = {
    every?: GapScoreWhereInput
    some?: GapScoreWhereInput
    none?: GapScoreWhereInput
  }

  export type CodingAttemptListRelationFilter = {
    every?: CodingAttemptWhereInput
    some?: CodingAttemptWhereInput
    none?: CodingAttemptWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GapScoreOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CodingAttemptOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AssociateCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    displayName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    readinessStatus?: SortOrder
    recommendedArea?: SortOrder
    lastComputedAt?: SortOrder
    email?: SortOrder
    authUserId?: SortOrder
    lastInvitedAt?: SortOrder
    cohortId?: SortOrder
  }

  export type AssociateAvgOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
  }

  export type AssociateMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    displayName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    readinessStatus?: SortOrder
    recommendedArea?: SortOrder
    lastComputedAt?: SortOrder
    email?: SortOrder
    authUserId?: SortOrder
    lastInvitedAt?: SortOrder
    cohortId?: SortOrder
  }

  export type AssociateMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    displayName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    readinessStatus?: SortOrder
    recommendedArea?: SortOrder
    lastComputedAt?: SortOrder
    email?: SortOrder
    authUserId?: SortOrder
    lastInvitedAt?: SortOrder
    cohortId?: SortOrder
  }

  export type AssociateSumOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AssociateNullableScalarRelationFilter = {
    is?: AssociateWhereInput | null
    isNot?: AssociateWhereInput | null
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    candidateName?: SortOrder
    interviewerName?: SortOrder
    date?: SortOrder
    status?: SortOrder
    questionCount?: SortOrder
    selectedWeeks?: SortOrder
    overallTechnicalScore?: SortOrder
    overallSoftSkillScore?: SortOrder
    technicalFeedback?: SortOrder
    softSkillFeedback?: SortOrder
    questions?: SortOrder
    starterQuestions?: SortOrder
    assessments?: SortOrder
    techMap?: SortOrder
    associateId?: SortOrder
    cohortId?: SortOrder
    aiTrainerVariance?: SortOrder
    mode?: SortOrder
    readinessRecomputeStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionAvgOrderByAggregateInput = {
    questionCount?: SortOrder
    overallTechnicalScore?: SortOrder
    overallSoftSkillScore?: SortOrder
    associateId?: SortOrder
    cohortId?: SortOrder
    aiTrainerVariance?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    candidateName?: SortOrder
    interviewerName?: SortOrder
    date?: SortOrder
    status?: SortOrder
    questionCount?: SortOrder
    overallTechnicalScore?: SortOrder
    overallSoftSkillScore?: SortOrder
    technicalFeedback?: SortOrder
    softSkillFeedback?: SortOrder
    associateId?: SortOrder
    cohortId?: SortOrder
    aiTrainerVariance?: SortOrder
    mode?: SortOrder
    readinessRecomputeStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    candidateName?: SortOrder
    interviewerName?: SortOrder
    date?: SortOrder
    status?: SortOrder
    questionCount?: SortOrder
    overallTechnicalScore?: SortOrder
    overallSoftSkillScore?: SortOrder
    technicalFeedback?: SortOrder
    softSkillFeedback?: SortOrder
    associateId?: SortOrder
    cohortId?: SortOrder
    aiTrainerVariance?: SortOrder
    mode?: SortOrder
    readinessRecomputeStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SessionSumOrderByAggregateInput = {
    questionCount?: SortOrder
    overallTechnicalScore?: SortOrder
    overallSoftSkillScore?: SortOrder
    associateId?: SortOrder
    cohortId?: SortOrder
    aiTrainerVariance?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type AssociateScalarRelationFilter = {
    is?: AssociateWhereInput
    isNot?: AssociateWhereInput
  }

  export type GapScoreAssociateIdSkillTopicCompoundUniqueInput = {
    associateId: number
    skill: string
    topic: string
  }

  export type GapScoreCountOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    skill?: SortOrder
    topic?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrder
    sessionCount?: SortOrder
    lastUpdated?: SortOrder
  }

  export type GapScoreAvgOrderByAggregateInput = {
    associateId?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrder
    sessionCount?: SortOrder
  }

  export type GapScoreMaxOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    skill?: SortOrder
    topic?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrder
    sessionCount?: SortOrder
    lastUpdated?: SortOrder
  }

  export type GapScoreMinOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    skill?: SortOrder
    topic?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrder
    sessionCount?: SortOrder
    lastUpdated?: SortOrder
  }

  export type GapScoreSumOrderByAggregateInput = {
    associateId?: SortOrder
    weightedScore?: SortOrder
    prevWeightedScore?: SortOrder
    sessionCount?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type SettingsCountOrderByAggregateInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingsAvgOrderByAggregateInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
  }

  export type SettingsMaxOrderByAggregateInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingsMinOrderByAggregateInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingsSumOrderByAggregateInput = {
    id?: SortOrder
    readinessThreshold?: SortOrder
  }

  export type AssociateListRelationFilter = {
    every?: AssociateWhereInput
    some?: AssociateWhereInput
    none?: AssociateWhereInput
  }

  export type CurriculumWeekListRelationFilter = {
    every?: CurriculumWeekWhereInput
    some?: CurriculumWeekWhereInput
    none?: CurriculumWeekWhereInput
  }

  export type CodingChallengeListRelationFilter = {
    every?: CodingChallengeWhereInput
    some?: CodingChallengeWhereInput
    none?: CodingChallengeWhereInput
  }

  export type AssociateOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CurriculumWeekOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CodingChallengeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CohortCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CohortAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type CohortMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CohortMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CohortSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type CohortScalarRelationFilter = {
    is?: CohortWhereInput
    isNot?: CohortWhereInput
  }

  export type CurriculumWeekCohortIdWeekNumberCompoundUniqueInput = {
    cohortId: number
    weekNumber: number
  }

  export type CurriculumWeekCountOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
    skillName?: SortOrder
    skillSlug?: SortOrder
    topicTags?: SortOrder
    startDate?: SortOrder
  }

  export type CurriculumWeekAvgOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
  }

  export type CurriculumWeekMaxOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
    skillName?: SortOrder
    skillSlug?: SortOrder
    startDate?: SortOrder
  }

  export type CurriculumWeekMinOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
    skillName?: SortOrder
    skillSlug?: SortOrder
    startDate?: SortOrder
  }

  export type CurriculumWeekSumOrderByAggregateInput = {
    id?: SortOrder
    cohortId?: SortOrder
    weekNumber?: SortOrder
  }

  export type ProfileCountOrderByAggregateInput = {
    id?: SortOrder
    authUserId?: SortOrder
    displayName?: SortOrder
    githubUsername?: SortOrder
    bio?: SortOrder
    learningGoals?: SortOrder
    passwordSetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProfileAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    authUserId?: SortOrder
    displayName?: SortOrder
    githubUsername?: SortOrder
    bio?: SortOrder
    learningGoals?: SortOrder
    passwordSetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProfileMinOrderByAggregateInput = {
    id?: SortOrder
    authUserId?: SortOrder
    displayName?: SortOrder
    githubUsername?: SortOrder
    bio?: SortOrder
    learningGoals?: SortOrder
    passwordSetAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProfileSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type AuthEventCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    email?: SortOrder
    ip?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type AuthEventMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    email?: SortOrder
    ip?: SortOrder
    createdAt?: SortOrder
  }

  export type AuthEventMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    email?: SortOrder
    ip?: SortOrder
    createdAt?: SortOrder
  }

  export type CodingTestCaseListRelationFilter = {
    every?: CodingTestCaseWhereInput
    some?: CodingTestCaseWhereInput
    none?: CodingTestCaseWhereInput
  }

  export type CodingTestCaseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CodingChallengeCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    language?: SortOrder
    difficulty?: SortOrder
    description?: SortOrder
    skillSlug?: SortOrder
    cohortId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CodingChallengeAvgOrderByAggregateInput = {
    cohortId?: SortOrder
  }

  export type CodingChallengeMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    language?: SortOrder
    difficulty?: SortOrder
    description?: SortOrder
    skillSlug?: SortOrder
    cohortId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CodingChallengeMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    language?: SortOrder
    difficulty?: SortOrder
    description?: SortOrder
    skillSlug?: SortOrder
    cohortId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CodingChallengeSumOrderByAggregateInput = {
    cohortId?: SortOrder
  }

  export type CodingChallengeScalarRelationFilter = {
    is?: CodingChallengeWhereInput
    isNot?: CodingChallengeWhereInput
  }

  export type CodingSkillSignalNullableScalarRelationFilter = {
    is?: CodingSkillSignalWhereInput | null
    isNot?: CodingSkillSignalWhereInput | null
  }

  export type CodingAttemptCountOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    challengeId?: SortOrder
    submittedCode?: SortOrder
    language?: SortOrder
    verdict?: SortOrder
    visibleTestResults?: SortOrder
    hiddenTestResults?: SortOrder
    score?: SortOrder
    judge0Token?: SortOrder
    submittedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type CodingAttemptAvgOrderByAggregateInput = {
    associateId?: SortOrder
    score?: SortOrder
  }

  export type CodingAttemptMaxOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    challengeId?: SortOrder
    submittedCode?: SortOrder
    language?: SortOrder
    verdict?: SortOrder
    score?: SortOrder
    judge0Token?: SortOrder
    submittedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type CodingAttemptMinOrderByAggregateInput = {
    id?: SortOrder
    associateId?: SortOrder
    challengeId?: SortOrder
    submittedCode?: SortOrder
    language?: SortOrder
    verdict?: SortOrder
    score?: SortOrder
    judge0Token?: SortOrder
    submittedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type CodingAttemptSumOrderByAggregateInput = {
    associateId?: SortOrder
    score?: SortOrder
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type CodingTestCaseChallengeIdIdCompoundUniqueInput = {
    challengeId: string
    id: string
  }

  export type CodingTestCaseCountOrderByAggregateInput = {
    id?: SortOrder
    challengeId?: SortOrder
    isHidden?: SortOrder
    stdin?: SortOrder
    expectedStdout?: SortOrder
    weight?: SortOrder
    orderIndex?: SortOrder
  }

  export type CodingTestCaseAvgOrderByAggregateInput = {
    weight?: SortOrder
    orderIndex?: SortOrder
  }

  export type CodingTestCaseMaxOrderByAggregateInput = {
    id?: SortOrder
    challengeId?: SortOrder
    isHidden?: SortOrder
    stdin?: SortOrder
    expectedStdout?: SortOrder
    weight?: SortOrder
    orderIndex?: SortOrder
  }

  export type CodingTestCaseMinOrderByAggregateInput = {
    id?: SortOrder
    challengeId?: SortOrder
    isHidden?: SortOrder
    stdin?: SortOrder
    expectedStdout?: SortOrder
    weight?: SortOrder
    orderIndex?: SortOrder
  }

  export type CodingTestCaseSumOrderByAggregateInput = {
    weight?: SortOrder
    orderIndex?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type CodingAttemptScalarRelationFilter = {
    is?: CodingAttemptWhereInput
    isNot?: CodingAttemptWhereInput
  }

  export type CodingSkillSignalCountOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    skillSlug?: SortOrder
    signalType?: SortOrder
    weight?: SortOrder
    mappedScore?: SortOrder
  }

  export type CodingSkillSignalAvgOrderByAggregateInput = {
    weight?: SortOrder
    mappedScore?: SortOrder
  }

  export type CodingSkillSignalMaxOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    skillSlug?: SortOrder
    signalType?: SortOrder
    weight?: SortOrder
    mappedScore?: SortOrder
  }

  export type CodingSkillSignalMinOrderByAggregateInput = {
    id?: SortOrder
    attemptId?: SortOrder
    skillSlug?: SortOrder
    signalType?: SortOrder
    weight?: SortOrder
    mappedScore?: SortOrder
  }

  export type CodingSkillSignalSumOrderByAggregateInput = {
    weight?: SortOrder
    mappedScore?: SortOrder
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type CohortCreateNestedOneWithoutAssociatesInput = {
    create?: XOR<CohortCreateWithoutAssociatesInput, CohortUncheckedCreateWithoutAssociatesInput>
    connectOrCreate?: CohortCreateOrConnectWithoutAssociatesInput
    connect?: CohortWhereUniqueInput
  }

  export type SessionCreateNestedManyWithoutAssociateInput = {
    create?: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput> | SessionCreateWithoutAssociateInput[] | SessionUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutAssociateInput | SessionCreateOrConnectWithoutAssociateInput[]
    createMany?: SessionCreateManyAssociateInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type GapScoreCreateNestedManyWithoutAssociateInput = {
    create?: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput> | GapScoreCreateWithoutAssociateInput[] | GapScoreUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: GapScoreCreateOrConnectWithoutAssociateInput | GapScoreCreateOrConnectWithoutAssociateInput[]
    createMany?: GapScoreCreateManyAssociateInputEnvelope
    connect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
  }

  export type CodingAttemptCreateNestedManyWithoutAssociateInput = {
    create?: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput> | CodingAttemptCreateWithoutAssociateInput[] | CodingAttemptUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutAssociateInput | CodingAttemptCreateOrConnectWithoutAssociateInput[]
    createMany?: CodingAttemptCreateManyAssociateInputEnvelope
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutAssociateInput = {
    create?: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput> | SessionCreateWithoutAssociateInput[] | SessionUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutAssociateInput | SessionCreateOrConnectWithoutAssociateInput[]
    createMany?: SessionCreateManyAssociateInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type GapScoreUncheckedCreateNestedManyWithoutAssociateInput = {
    create?: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput> | GapScoreCreateWithoutAssociateInput[] | GapScoreUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: GapScoreCreateOrConnectWithoutAssociateInput | GapScoreCreateOrConnectWithoutAssociateInput[]
    createMany?: GapScoreCreateManyAssociateInputEnvelope
    connect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
  }

  export type CodingAttemptUncheckedCreateNestedManyWithoutAssociateInput = {
    create?: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput> | CodingAttemptCreateWithoutAssociateInput[] | CodingAttemptUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutAssociateInput | CodingAttemptCreateOrConnectWithoutAssociateInput[]
    createMany?: CodingAttemptCreateManyAssociateInputEnvelope
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type CohortUpdateOneWithoutAssociatesNestedInput = {
    create?: XOR<CohortCreateWithoutAssociatesInput, CohortUncheckedCreateWithoutAssociatesInput>
    connectOrCreate?: CohortCreateOrConnectWithoutAssociatesInput
    upsert?: CohortUpsertWithoutAssociatesInput
    disconnect?: CohortWhereInput | boolean
    delete?: CohortWhereInput | boolean
    connect?: CohortWhereUniqueInput
    update?: XOR<XOR<CohortUpdateToOneWithWhereWithoutAssociatesInput, CohortUpdateWithoutAssociatesInput>, CohortUncheckedUpdateWithoutAssociatesInput>
  }

  export type SessionUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput> | SessionCreateWithoutAssociateInput[] | SessionUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutAssociateInput | SessionCreateOrConnectWithoutAssociateInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutAssociateInput | SessionUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: SessionCreateManyAssociateInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutAssociateInput | SessionUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutAssociateInput | SessionUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type GapScoreUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput> | GapScoreCreateWithoutAssociateInput[] | GapScoreUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: GapScoreCreateOrConnectWithoutAssociateInput | GapScoreCreateOrConnectWithoutAssociateInput[]
    upsert?: GapScoreUpsertWithWhereUniqueWithoutAssociateInput | GapScoreUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: GapScoreCreateManyAssociateInputEnvelope
    set?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    disconnect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    delete?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    connect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    update?: GapScoreUpdateWithWhereUniqueWithoutAssociateInput | GapScoreUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: GapScoreUpdateManyWithWhereWithoutAssociateInput | GapScoreUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: GapScoreScalarWhereInput | GapScoreScalarWhereInput[]
  }

  export type CodingAttemptUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput> | CodingAttemptCreateWithoutAssociateInput[] | CodingAttemptUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutAssociateInput | CodingAttemptCreateOrConnectWithoutAssociateInput[]
    upsert?: CodingAttemptUpsertWithWhereUniqueWithoutAssociateInput | CodingAttemptUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: CodingAttemptCreateManyAssociateInputEnvelope
    set?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    disconnect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    delete?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    update?: CodingAttemptUpdateWithWhereUniqueWithoutAssociateInput | CodingAttemptUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: CodingAttemptUpdateManyWithWhereWithoutAssociateInput | CodingAttemptUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type SessionUncheckedUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput> | SessionCreateWithoutAssociateInput[] | SessionUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutAssociateInput | SessionCreateOrConnectWithoutAssociateInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutAssociateInput | SessionUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: SessionCreateManyAssociateInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutAssociateInput | SessionUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutAssociateInput | SessionUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type GapScoreUncheckedUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput> | GapScoreCreateWithoutAssociateInput[] | GapScoreUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: GapScoreCreateOrConnectWithoutAssociateInput | GapScoreCreateOrConnectWithoutAssociateInput[]
    upsert?: GapScoreUpsertWithWhereUniqueWithoutAssociateInput | GapScoreUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: GapScoreCreateManyAssociateInputEnvelope
    set?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    disconnect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    delete?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    connect?: GapScoreWhereUniqueInput | GapScoreWhereUniqueInput[]
    update?: GapScoreUpdateWithWhereUniqueWithoutAssociateInput | GapScoreUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: GapScoreUpdateManyWithWhereWithoutAssociateInput | GapScoreUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: GapScoreScalarWhereInput | GapScoreScalarWhereInput[]
  }

  export type CodingAttemptUncheckedUpdateManyWithoutAssociateNestedInput = {
    create?: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput> | CodingAttemptCreateWithoutAssociateInput[] | CodingAttemptUncheckedCreateWithoutAssociateInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutAssociateInput | CodingAttemptCreateOrConnectWithoutAssociateInput[]
    upsert?: CodingAttemptUpsertWithWhereUniqueWithoutAssociateInput | CodingAttemptUpsertWithWhereUniqueWithoutAssociateInput[]
    createMany?: CodingAttemptCreateManyAssociateInputEnvelope
    set?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    disconnect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    delete?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    update?: CodingAttemptUpdateWithWhereUniqueWithoutAssociateInput | CodingAttemptUpdateWithWhereUniqueWithoutAssociateInput[]
    updateMany?: CodingAttemptUpdateManyWithWhereWithoutAssociateInput | CodingAttemptUpdateManyWithWhereWithoutAssociateInput[]
    deleteMany?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
  }

  export type AssociateCreateNestedOneWithoutSessionsInput = {
    create?: XOR<AssociateCreateWithoutSessionsInput, AssociateUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutSessionsInput
    connect?: AssociateWhereUniqueInput
  }

  export type CohortCreateNestedOneWithoutSessionsInput = {
    create?: XOR<CohortCreateWithoutSessionsInput, CohortUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: CohortCreateOrConnectWithoutSessionsInput
    connect?: CohortWhereUniqueInput
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AssociateUpdateOneWithoutSessionsNestedInput = {
    create?: XOR<AssociateCreateWithoutSessionsInput, AssociateUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutSessionsInput
    upsert?: AssociateUpsertWithoutSessionsInput
    disconnect?: AssociateWhereInput | boolean
    delete?: AssociateWhereInput | boolean
    connect?: AssociateWhereUniqueInput
    update?: XOR<XOR<AssociateUpdateToOneWithWhereWithoutSessionsInput, AssociateUpdateWithoutSessionsInput>, AssociateUncheckedUpdateWithoutSessionsInput>
  }

  export type CohortUpdateOneWithoutSessionsNestedInput = {
    create?: XOR<CohortCreateWithoutSessionsInput, CohortUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: CohortCreateOrConnectWithoutSessionsInput
    upsert?: CohortUpsertWithoutSessionsInput
    disconnect?: CohortWhereInput | boolean
    delete?: CohortWhereInput | boolean
    connect?: CohortWhereUniqueInput
    update?: XOR<XOR<CohortUpdateToOneWithWhereWithoutSessionsInput, CohortUpdateWithoutSessionsInput>, CohortUncheckedUpdateWithoutSessionsInput>
  }

  export type AssociateCreateNestedOneWithoutGapScoresInput = {
    create?: XOR<AssociateCreateWithoutGapScoresInput, AssociateUncheckedCreateWithoutGapScoresInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutGapScoresInput
    connect?: AssociateWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AssociateUpdateOneRequiredWithoutGapScoresNestedInput = {
    create?: XOR<AssociateCreateWithoutGapScoresInput, AssociateUncheckedCreateWithoutGapScoresInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutGapScoresInput
    upsert?: AssociateUpsertWithoutGapScoresInput
    connect?: AssociateWhereUniqueInput
    update?: XOR<XOR<AssociateUpdateToOneWithWhereWithoutGapScoresInput, AssociateUpdateWithoutGapScoresInput>, AssociateUncheckedUpdateWithoutGapScoresInput>
  }

  export type AssociateCreateNestedManyWithoutCohortInput = {
    create?: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput> | AssociateCreateWithoutCohortInput[] | AssociateUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: AssociateCreateOrConnectWithoutCohortInput | AssociateCreateOrConnectWithoutCohortInput[]
    createMany?: AssociateCreateManyCohortInputEnvelope
    connect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutCohortInput = {
    create?: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput> | SessionCreateWithoutCohortInput[] | SessionUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutCohortInput | SessionCreateOrConnectWithoutCohortInput[]
    createMany?: SessionCreateManyCohortInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type CurriculumWeekCreateNestedManyWithoutCohortInput = {
    create?: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput> | CurriculumWeekCreateWithoutCohortInput[] | CurriculumWeekUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CurriculumWeekCreateOrConnectWithoutCohortInput | CurriculumWeekCreateOrConnectWithoutCohortInput[]
    createMany?: CurriculumWeekCreateManyCohortInputEnvelope
    connect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
  }

  export type CodingChallengeCreateNestedManyWithoutCohortInput = {
    create?: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput> | CodingChallengeCreateWithoutCohortInput[] | CodingChallengeUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutCohortInput | CodingChallengeCreateOrConnectWithoutCohortInput[]
    createMany?: CodingChallengeCreateManyCohortInputEnvelope
    connect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
  }

  export type AssociateUncheckedCreateNestedManyWithoutCohortInput = {
    create?: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput> | AssociateCreateWithoutCohortInput[] | AssociateUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: AssociateCreateOrConnectWithoutCohortInput | AssociateCreateOrConnectWithoutCohortInput[]
    createMany?: AssociateCreateManyCohortInputEnvelope
    connect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutCohortInput = {
    create?: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput> | SessionCreateWithoutCohortInput[] | SessionUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutCohortInput | SessionCreateOrConnectWithoutCohortInput[]
    createMany?: SessionCreateManyCohortInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type CurriculumWeekUncheckedCreateNestedManyWithoutCohortInput = {
    create?: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput> | CurriculumWeekCreateWithoutCohortInput[] | CurriculumWeekUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CurriculumWeekCreateOrConnectWithoutCohortInput | CurriculumWeekCreateOrConnectWithoutCohortInput[]
    createMany?: CurriculumWeekCreateManyCohortInputEnvelope
    connect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
  }

  export type CodingChallengeUncheckedCreateNestedManyWithoutCohortInput = {
    create?: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput> | CodingChallengeCreateWithoutCohortInput[] | CodingChallengeUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutCohortInput | CodingChallengeCreateOrConnectWithoutCohortInput[]
    createMany?: CodingChallengeCreateManyCohortInputEnvelope
    connect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
  }

  export type AssociateUpdateManyWithoutCohortNestedInput = {
    create?: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput> | AssociateCreateWithoutCohortInput[] | AssociateUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: AssociateCreateOrConnectWithoutCohortInput | AssociateCreateOrConnectWithoutCohortInput[]
    upsert?: AssociateUpsertWithWhereUniqueWithoutCohortInput | AssociateUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: AssociateCreateManyCohortInputEnvelope
    set?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    disconnect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    delete?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    connect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    update?: AssociateUpdateWithWhereUniqueWithoutCohortInput | AssociateUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: AssociateUpdateManyWithWhereWithoutCohortInput | AssociateUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: AssociateScalarWhereInput | AssociateScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutCohortNestedInput = {
    create?: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput> | SessionCreateWithoutCohortInput[] | SessionUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutCohortInput | SessionCreateOrConnectWithoutCohortInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutCohortInput | SessionUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: SessionCreateManyCohortInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutCohortInput | SessionUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutCohortInput | SessionUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type CurriculumWeekUpdateManyWithoutCohortNestedInput = {
    create?: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput> | CurriculumWeekCreateWithoutCohortInput[] | CurriculumWeekUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CurriculumWeekCreateOrConnectWithoutCohortInput | CurriculumWeekCreateOrConnectWithoutCohortInput[]
    upsert?: CurriculumWeekUpsertWithWhereUniqueWithoutCohortInput | CurriculumWeekUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: CurriculumWeekCreateManyCohortInputEnvelope
    set?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    disconnect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    delete?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    connect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    update?: CurriculumWeekUpdateWithWhereUniqueWithoutCohortInput | CurriculumWeekUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: CurriculumWeekUpdateManyWithWhereWithoutCohortInput | CurriculumWeekUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: CurriculumWeekScalarWhereInput | CurriculumWeekScalarWhereInput[]
  }

  export type CodingChallengeUpdateManyWithoutCohortNestedInput = {
    create?: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput> | CodingChallengeCreateWithoutCohortInput[] | CodingChallengeUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutCohortInput | CodingChallengeCreateOrConnectWithoutCohortInput[]
    upsert?: CodingChallengeUpsertWithWhereUniqueWithoutCohortInput | CodingChallengeUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: CodingChallengeCreateManyCohortInputEnvelope
    set?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    disconnect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    delete?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    connect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    update?: CodingChallengeUpdateWithWhereUniqueWithoutCohortInput | CodingChallengeUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: CodingChallengeUpdateManyWithWhereWithoutCohortInput | CodingChallengeUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: CodingChallengeScalarWhereInput | CodingChallengeScalarWhereInput[]
  }

  export type AssociateUncheckedUpdateManyWithoutCohortNestedInput = {
    create?: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput> | AssociateCreateWithoutCohortInput[] | AssociateUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: AssociateCreateOrConnectWithoutCohortInput | AssociateCreateOrConnectWithoutCohortInput[]
    upsert?: AssociateUpsertWithWhereUniqueWithoutCohortInput | AssociateUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: AssociateCreateManyCohortInputEnvelope
    set?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    disconnect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    delete?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    connect?: AssociateWhereUniqueInput | AssociateWhereUniqueInput[]
    update?: AssociateUpdateWithWhereUniqueWithoutCohortInput | AssociateUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: AssociateUpdateManyWithWhereWithoutCohortInput | AssociateUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: AssociateScalarWhereInput | AssociateScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutCohortNestedInput = {
    create?: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput> | SessionCreateWithoutCohortInput[] | SessionUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutCohortInput | SessionCreateOrConnectWithoutCohortInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutCohortInput | SessionUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: SessionCreateManyCohortInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutCohortInput | SessionUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutCohortInput | SessionUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type CurriculumWeekUncheckedUpdateManyWithoutCohortNestedInput = {
    create?: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput> | CurriculumWeekCreateWithoutCohortInput[] | CurriculumWeekUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CurriculumWeekCreateOrConnectWithoutCohortInput | CurriculumWeekCreateOrConnectWithoutCohortInput[]
    upsert?: CurriculumWeekUpsertWithWhereUniqueWithoutCohortInput | CurriculumWeekUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: CurriculumWeekCreateManyCohortInputEnvelope
    set?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    disconnect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    delete?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    connect?: CurriculumWeekWhereUniqueInput | CurriculumWeekWhereUniqueInput[]
    update?: CurriculumWeekUpdateWithWhereUniqueWithoutCohortInput | CurriculumWeekUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: CurriculumWeekUpdateManyWithWhereWithoutCohortInput | CurriculumWeekUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: CurriculumWeekScalarWhereInput | CurriculumWeekScalarWhereInput[]
  }

  export type CodingChallengeUncheckedUpdateManyWithoutCohortNestedInput = {
    create?: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput> | CodingChallengeCreateWithoutCohortInput[] | CodingChallengeUncheckedCreateWithoutCohortInput[]
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutCohortInput | CodingChallengeCreateOrConnectWithoutCohortInput[]
    upsert?: CodingChallengeUpsertWithWhereUniqueWithoutCohortInput | CodingChallengeUpsertWithWhereUniqueWithoutCohortInput[]
    createMany?: CodingChallengeCreateManyCohortInputEnvelope
    set?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    disconnect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    delete?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    connect?: CodingChallengeWhereUniqueInput | CodingChallengeWhereUniqueInput[]
    update?: CodingChallengeUpdateWithWhereUniqueWithoutCohortInput | CodingChallengeUpdateWithWhereUniqueWithoutCohortInput[]
    updateMany?: CodingChallengeUpdateManyWithWhereWithoutCohortInput | CodingChallengeUpdateManyWithWhereWithoutCohortInput[]
    deleteMany?: CodingChallengeScalarWhereInput | CodingChallengeScalarWhereInput[]
  }

  export type CurriculumWeekCreatetopicTagsInput = {
    set: string[]
  }

  export type CohortCreateNestedOneWithoutCurriculumWeeksInput = {
    create?: XOR<CohortCreateWithoutCurriculumWeeksInput, CohortUncheckedCreateWithoutCurriculumWeeksInput>
    connectOrCreate?: CohortCreateOrConnectWithoutCurriculumWeeksInput
    connect?: CohortWhereUniqueInput
  }

  export type CurriculumWeekUpdatetopicTagsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type CohortUpdateOneRequiredWithoutCurriculumWeeksNestedInput = {
    create?: XOR<CohortCreateWithoutCurriculumWeeksInput, CohortUncheckedCreateWithoutCurriculumWeeksInput>
    connectOrCreate?: CohortCreateOrConnectWithoutCurriculumWeeksInput
    upsert?: CohortUpsertWithoutCurriculumWeeksInput
    connect?: CohortWhereUniqueInput
    update?: XOR<XOR<CohortUpdateToOneWithWhereWithoutCurriculumWeeksInput, CohortUpdateWithoutCurriculumWeeksInput>, CohortUncheckedUpdateWithoutCurriculumWeeksInput>
  }

  export type CohortCreateNestedOneWithoutCodingChallengesInput = {
    create?: XOR<CohortCreateWithoutCodingChallengesInput, CohortUncheckedCreateWithoutCodingChallengesInput>
    connectOrCreate?: CohortCreateOrConnectWithoutCodingChallengesInput
    connect?: CohortWhereUniqueInput
  }

  export type CodingAttemptCreateNestedManyWithoutChallengeInput = {
    create?: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput> | CodingAttemptCreateWithoutChallengeInput[] | CodingAttemptUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutChallengeInput | CodingAttemptCreateOrConnectWithoutChallengeInput[]
    createMany?: CodingAttemptCreateManyChallengeInputEnvelope
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
  }

  export type CodingTestCaseCreateNestedManyWithoutChallengeInput = {
    create?: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput> | CodingTestCaseCreateWithoutChallengeInput[] | CodingTestCaseUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingTestCaseCreateOrConnectWithoutChallengeInput | CodingTestCaseCreateOrConnectWithoutChallengeInput[]
    createMany?: CodingTestCaseCreateManyChallengeInputEnvelope
    connect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
  }

  export type CodingAttemptUncheckedCreateNestedManyWithoutChallengeInput = {
    create?: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput> | CodingAttemptCreateWithoutChallengeInput[] | CodingAttemptUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutChallengeInput | CodingAttemptCreateOrConnectWithoutChallengeInput[]
    createMany?: CodingAttemptCreateManyChallengeInputEnvelope
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
  }

  export type CodingTestCaseUncheckedCreateNestedManyWithoutChallengeInput = {
    create?: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput> | CodingTestCaseCreateWithoutChallengeInput[] | CodingTestCaseUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingTestCaseCreateOrConnectWithoutChallengeInput | CodingTestCaseCreateOrConnectWithoutChallengeInput[]
    createMany?: CodingTestCaseCreateManyChallengeInputEnvelope
    connect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
  }

  export type CohortUpdateOneWithoutCodingChallengesNestedInput = {
    create?: XOR<CohortCreateWithoutCodingChallengesInput, CohortUncheckedCreateWithoutCodingChallengesInput>
    connectOrCreate?: CohortCreateOrConnectWithoutCodingChallengesInput
    upsert?: CohortUpsertWithoutCodingChallengesInput
    disconnect?: CohortWhereInput | boolean
    delete?: CohortWhereInput | boolean
    connect?: CohortWhereUniqueInput
    update?: XOR<XOR<CohortUpdateToOneWithWhereWithoutCodingChallengesInput, CohortUpdateWithoutCodingChallengesInput>, CohortUncheckedUpdateWithoutCodingChallengesInput>
  }

  export type CodingAttemptUpdateManyWithoutChallengeNestedInput = {
    create?: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput> | CodingAttemptCreateWithoutChallengeInput[] | CodingAttemptUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutChallengeInput | CodingAttemptCreateOrConnectWithoutChallengeInput[]
    upsert?: CodingAttemptUpsertWithWhereUniqueWithoutChallengeInput | CodingAttemptUpsertWithWhereUniqueWithoutChallengeInput[]
    createMany?: CodingAttemptCreateManyChallengeInputEnvelope
    set?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    disconnect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    delete?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    update?: CodingAttemptUpdateWithWhereUniqueWithoutChallengeInput | CodingAttemptUpdateWithWhereUniqueWithoutChallengeInput[]
    updateMany?: CodingAttemptUpdateManyWithWhereWithoutChallengeInput | CodingAttemptUpdateManyWithWhereWithoutChallengeInput[]
    deleteMany?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
  }

  export type CodingTestCaseUpdateManyWithoutChallengeNestedInput = {
    create?: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput> | CodingTestCaseCreateWithoutChallengeInput[] | CodingTestCaseUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingTestCaseCreateOrConnectWithoutChallengeInput | CodingTestCaseCreateOrConnectWithoutChallengeInput[]
    upsert?: CodingTestCaseUpsertWithWhereUniqueWithoutChallengeInput | CodingTestCaseUpsertWithWhereUniqueWithoutChallengeInput[]
    createMany?: CodingTestCaseCreateManyChallengeInputEnvelope
    set?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    disconnect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    delete?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    connect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    update?: CodingTestCaseUpdateWithWhereUniqueWithoutChallengeInput | CodingTestCaseUpdateWithWhereUniqueWithoutChallengeInput[]
    updateMany?: CodingTestCaseUpdateManyWithWhereWithoutChallengeInput | CodingTestCaseUpdateManyWithWhereWithoutChallengeInput[]
    deleteMany?: CodingTestCaseScalarWhereInput | CodingTestCaseScalarWhereInput[]
  }

  export type CodingAttemptUncheckedUpdateManyWithoutChallengeNestedInput = {
    create?: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput> | CodingAttemptCreateWithoutChallengeInput[] | CodingAttemptUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutChallengeInput | CodingAttemptCreateOrConnectWithoutChallengeInput[]
    upsert?: CodingAttemptUpsertWithWhereUniqueWithoutChallengeInput | CodingAttemptUpsertWithWhereUniqueWithoutChallengeInput[]
    createMany?: CodingAttemptCreateManyChallengeInputEnvelope
    set?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    disconnect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    delete?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    connect?: CodingAttemptWhereUniqueInput | CodingAttemptWhereUniqueInput[]
    update?: CodingAttemptUpdateWithWhereUniqueWithoutChallengeInput | CodingAttemptUpdateWithWhereUniqueWithoutChallengeInput[]
    updateMany?: CodingAttemptUpdateManyWithWhereWithoutChallengeInput | CodingAttemptUpdateManyWithWhereWithoutChallengeInput[]
    deleteMany?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
  }

  export type CodingTestCaseUncheckedUpdateManyWithoutChallengeNestedInput = {
    create?: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput> | CodingTestCaseCreateWithoutChallengeInput[] | CodingTestCaseUncheckedCreateWithoutChallengeInput[]
    connectOrCreate?: CodingTestCaseCreateOrConnectWithoutChallengeInput | CodingTestCaseCreateOrConnectWithoutChallengeInput[]
    upsert?: CodingTestCaseUpsertWithWhereUniqueWithoutChallengeInput | CodingTestCaseUpsertWithWhereUniqueWithoutChallengeInput[]
    createMany?: CodingTestCaseCreateManyChallengeInputEnvelope
    set?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    disconnect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    delete?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    connect?: CodingTestCaseWhereUniqueInput | CodingTestCaseWhereUniqueInput[]
    update?: CodingTestCaseUpdateWithWhereUniqueWithoutChallengeInput | CodingTestCaseUpdateWithWhereUniqueWithoutChallengeInput[]
    updateMany?: CodingTestCaseUpdateManyWithWhereWithoutChallengeInput | CodingTestCaseUpdateManyWithWhereWithoutChallengeInput[]
    deleteMany?: CodingTestCaseScalarWhereInput | CodingTestCaseScalarWhereInput[]
  }

  export type AssociateCreateNestedOneWithoutCodingAttemptsInput = {
    create?: XOR<AssociateCreateWithoutCodingAttemptsInput, AssociateUncheckedCreateWithoutCodingAttemptsInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutCodingAttemptsInput
    connect?: AssociateWhereUniqueInput
  }

  export type CodingChallengeCreateNestedOneWithoutAttemptsInput = {
    create?: XOR<CodingChallengeCreateWithoutAttemptsInput, CodingChallengeUncheckedCreateWithoutAttemptsInput>
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutAttemptsInput
    connect?: CodingChallengeWhereUniqueInput
  }

  export type CodingSkillSignalCreateNestedOneWithoutAttemptInput = {
    create?: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
    connectOrCreate?: CodingSkillSignalCreateOrConnectWithoutAttemptInput
    connect?: CodingSkillSignalWhereUniqueInput
  }

  export type CodingSkillSignalUncheckedCreateNestedOneWithoutAttemptInput = {
    create?: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
    connectOrCreate?: CodingSkillSignalCreateOrConnectWithoutAttemptInput
    connect?: CodingSkillSignalWhereUniqueInput
  }

  export type AssociateUpdateOneRequiredWithoutCodingAttemptsNestedInput = {
    create?: XOR<AssociateCreateWithoutCodingAttemptsInput, AssociateUncheckedCreateWithoutCodingAttemptsInput>
    connectOrCreate?: AssociateCreateOrConnectWithoutCodingAttemptsInput
    upsert?: AssociateUpsertWithoutCodingAttemptsInput
    connect?: AssociateWhereUniqueInput
    update?: XOR<XOR<AssociateUpdateToOneWithWhereWithoutCodingAttemptsInput, AssociateUpdateWithoutCodingAttemptsInput>, AssociateUncheckedUpdateWithoutCodingAttemptsInput>
  }

  export type CodingChallengeUpdateOneRequiredWithoutAttemptsNestedInput = {
    create?: XOR<CodingChallengeCreateWithoutAttemptsInput, CodingChallengeUncheckedCreateWithoutAttemptsInput>
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutAttemptsInput
    upsert?: CodingChallengeUpsertWithoutAttemptsInput
    connect?: CodingChallengeWhereUniqueInput
    update?: XOR<XOR<CodingChallengeUpdateToOneWithWhereWithoutAttemptsInput, CodingChallengeUpdateWithoutAttemptsInput>, CodingChallengeUncheckedUpdateWithoutAttemptsInput>
  }

  export type CodingSkillSignalUpdateOneWithoutAttemptNestedInput = {
    create?: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
    connectOrCreate?: CodingSkillSignalCreateOrConnectWithoutAttemptInput
    upsert?: CodingSkillSignalUpsertWithoutAttemptInput
    disconnect?: CodingSkillSignalWhereInput | boolean
    delete?: CodingSkillSignalWhereInput | boolean
    connect?: CodingSkillSignalWhereUniqueInput
    update?: XOR<XOR<CodingSkillSignalUpdateToOneWithWhereWithoutAttemptInput, CodingSkillSignalUpdateWithoutAttemptInput>, CodingSkillSignalUncheckedUpdateWithoutAttemptInput>
  }

  export type CodingSkillSignalUncheckedUpdateOneWithoutAttemptNestedInput = {
    create?: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
    connectOrCreate?: CodingSkillSignalCreateOrConnectWithoutAttemptInput
    upsert?: CodingSkillSignalUpsertWithoutAttemptInput
    disconnect?: CodingSkillSignalWhereInput | boolean
    delete?: CodingSkillSignalWhereInput | boolean
    connect?: CodingSkillSignalWhereUniqueInput
    update?: XOR<XOR<CodingSkillSignalUpdateToOneWithWhereWithoutAttemptInput, CodingSkillSignalUpdateWithoutAttemptInput>, CodingSkillSignalUncheckedUpdateWithoutAttemptInput>
  }

  export type CodingChallengeCreateNestedOneWithoutTestCasesInput = {
    create?: XOR<CodingChallengeCreateWithoutTestCasesInput, CodingChallengeUncheckedCreateWithoutTestCasesInput>
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutTestCasesInput
    connect?: CodingChallengeWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type CodingChallengeUpdateOneRequiredWithoutTestCasesNestedInput = {
    create?: XOR<CodingChallengeCreateWithoutTestCasesInput, CodingChallengeUncheckedCreateWithoutTestCasesInput>
    connectOrCreate?: CodingChallengeCreateOrConnectWithoutTestCasesInput
    upsert?: CodingChallengeUpsertWithoutTestCasesInput
    connect?: CodingChallengeWhereUniqueInput
    update?: XOR<XOR<CodingChallengeUpdateToOneWithWhereWithoutTestCasesInput, CodingChallengeUpdateWithoutTestCasesInput>, CodingChallengeUncheckedUpdateWithoutTestCasesInput>
  }

  export type CodingAttemptCreateNestedOneWithoutSignalInput = {
    create?: XOR<CodingAttemptCreateWithoutSignalInput, CodingAttemptUncheckedCreateWithoutSignalInput>
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutSignalInput
    connect?: CodingAttemptWhereUniqueInput
  }

  export type CodingAttemptUpdateOneRequiredWithoutSignalNestedInput = {
    create?: XOR<CodingAttemptCreateWithoutSignalInput, CodingAttemptUncheckedCreateWithoutSignalInput>
    connectOrCreate?: CodingAttemptCreateOrConnectWithoutSignalInput
    upsert?: CodingAttemptUpsertWithoutSignalInput
    connect?: CodingAttemptWhereUniqueInput
    update?: XOR<XOR<CodingAttemptUpdateToOneWithWhereWithoutSignalInput, CodingAttemptUpdateWithoutSignalInput>, CodingAttemptUncheckedUpdateWithoutSignalInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type CohortCreateWithoutAssociatesInput = {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeCreateNestedManyWithoutCohortInput
  }

  export type CohortUncheckedCreateWithoutAssociatesInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekUncheckedCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeUncheckedCreateNestedManyWithoutCohortInput
  }

  export type CohortCreateOrConnectWithoutAssociatesInput = {
    where: CohortWhereUniqueInput
    create: XOR<CohortCreateWithoutAssociatesInput, CohortUncheckedCreateWithoutAssociatesInput>
  }

  export type SessionCreateWithoutAssociateInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cohort?: CohortCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateWithoutAssociateInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    cohortId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutAssociateInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput>
  }

  export type SessionCreateManyAssociateInputEnvelope = {
    data: SessionCreateManyAssociateInput | SessionCreateManyAssociateInput[]
    skipDuplicates?: boolean
  }

  export type GapScoreCreateWithoutAssociateInput = {
    id?: string
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
  }

  export type GapScoreUncheckedCreateWithoutAssociateInput = {
    id?: string
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
  }

  export type GapScoreCreateOrConnectWithoutAssociateInput = {
    where: GapScoreWhereUniqueInput
    create: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput>
  }

  export type GapScoreCreateManyAssociateInputEnvelope = {
    data: GapScoreCreateManyAssociateInput | GapScoreCreateManyAssociateInput[]
    skipDuplicates?: boolean
  }

  export type CodingAttemptCreateWithoutAssociateInput = {
    id?: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    challenge: CodingChallengeCreateNestedOneWithoutAttemptsInput
    signal?: CodingSkillSignalCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptUncheckedCreateWithoutAssociateInput = {
    id?: string
    challengeId: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    signal?: CodingSkillSignalUncheckedCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptCreateOrConnectWithoutAssociateInput = {
    where: CodingAttemptWhereUniqueInput
    create: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput>
  }

  export type CodingAttemptCreateManyAssociateInputEnvelope = {
    data: CodingAttemptCreateManyAssociateInput | CodingAttemptCreateManyAssociateInput[]
    skipDuplicates?: boolean
  }

  export type CohortUpsertWithoutAssociatesInput = {
    update: XOR<CohortUpdateWithoutAssociatesInput, CohortUncheckedUpdateWithoutAssociatesInput>
    create: XOR<CohortCreateWithoutAssociatesInput, CohortUncheckedCreateWithoutAssociatesInput>
    where?: CohortWhereInput
  }

  export type CohortUpdateToOneWithWhereWithoutAssociatesInput = {
    where?: CohortWhereInput
    data: XOR<CohortUpdateWithoutAssociatesInput, CohortUncheckedUpdateWithoutAssociatesInput>
  }

  export type CohortUpdateWithoutAssociatesInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUpdateManyWithoutCohortNestedInput
  }

  export type CohortUncheckedUpdateWithoutAssociatesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUncheckedUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUncheckedUpdateManyWithoutCohortNestedInput
  }

  export type SessionUpsertWithWhereUniqueWithoutAssociateInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutAssociateInput, SessionUncheckedUpdateWithoutAssociateInput>
    create: XOR<SessionCreateWithoutAssociateInput, SessionUncheckedCreateWithoutAssociateInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutAssociateInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutAssociateInput, SessionUncheckedUpdateWithoutAssociateInput>
  }

  export type SessionUpdateManyWithWhereWithoutAssociateInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutAssociateInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    candidateName?: StringNullableFilter<"Session"> | string | null
    interviewerName?: StringNullableFilter<"Session"> | string | null
    date?: StringFilter<"Session"> | string
    status?: StringFilter<"Session"> | string
    questionCount?: IntFilter<"Session"> | number
    selectedWeeks?: JsonFilter<"Session">
    overallTechnicalScore?: FloatNullableFilter<"Session"> | number | null
    overallSoftSkillScore?: FloatNullableFilter<"Session"> | number | null
    technicalFeedback?: StringNullableFilter<"Session"> | string | null
    softSkillFeedback?: StringNullableFilter<"Session"> | string | null
    questions?: JsonFilter<"Session">
    starterQuestions?: JsonFilter<"Session">
    assessments?: JsonFilter<"Session">
    techMap?: JsonNullableFilter<"Session">
    associateId?: IntNullableFilter<"Session"> | number | null
    cohortId?: IntNullableFilter<"Session"> | number | null
    aiTrainerVariance?: FloatNullableFilter<"Session"> | number | null
    mode?: StringFilter<"Session"> | string
    readinessRecomputeStatus?: StringFilter<"Session"> | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type GapScoreUpsertWithWhereUniqueWithoutAssociateInput = {
    where: GapScoreWhereUniqueInput
    update: XOR<GapScoreUpdateWithoutAssociateInput, GapScoreUncheckedUpdateWithoutAssociateInput>
    create: XOR<GapScoreCreateWithoutAssociateInput, GapScoreUncheckedCreateWithoutAssociateInput>
  }

  export type GapScoreUpdateWithWhereUniqueWithoutAssociateInput = {
    where: GapScoreWhereUniqueInput
    data: XOR<GapScoreUpdateWithoutAssociateInput, GapScoreUncheckedUpdateWithoutAssociateInput>
  }

  export type GapScoreUpdateManyWithWhereWithoutAssociateInput = {
    where: GapScoreScalarWhereInput
    data: XOR<GapScoreUpdateManyMutationInput, GapScoreUncheckedUpdateManyWithoutAssociateInput>
  }

  export type GapScoreScalarWhereInput = {
    AND?: GapScoreScalarWhereInput | GapScoreScalarWhereInput[]
    OR?: GapScoreScalarWhereInput[]
    NOT?: GapScoreScalarWhereInput | GapScoreScalarWhereInput[]
    id?: StringFilter<"GapScore"> | string
    associateId?: IntFilter<"GapScore"> | number
    skill?: StringFilter<"GapScore"> | string
    topic?: StringFilter<"GapScore"> | string
    weightedScore?: FloatFilter<"GapScore"> | number
    prevWeightedScore?: FloatNullableFilter<"GapScore"> | number | null
    sessionCount?: IntFilter<"GapScore"> | number
    lastUpdated?: DateTimeFilter<"GapScore"> | Date | string
  }

  export type CodingAttemptUpsertWithWhereUniqueWithoutAssociateInput = {
    where: CodingAttemptWhereUniqueInput
    update: XOR<CodingAttemptUpdateWithoutAssociateInput, CodingAttemptUncheckedUpdateWithoutAssociateInput>
    create: XOR<CodingAttemptCreateWithoutAssociateInput, CodingAttemptUncheckedCreateWithoutAssociateInput>
  }

  export type CodingAttemptUpdateWithWhereUniqueWithoutAssociateInput = {
    where: CodingAttemptWhereUniqueInput
    data: XOR<CodingAttemptUpdateWithoutAssociateInput, CodingAttemptUncheckedUpdateWithoutAssociateInput>
  }

  export type CodingAttemptUpdateManyWithWhereWithoutAssociateInput = {
    where: CodingAttemptScalarWhereInput
    data: XOR<CodingAttemptUpdateManyMutationInput, CodingAttemptUncheckedUpdateManyWithoutAssociateInput>
  }

  export type CodingAttemptScalarWhereInput = {
    AND?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
    OR?: CodingAttemptScalarWhereInput[]
    NOT?: CodingAttemptScalarWhereInput | CodingAttemptScalarWhereInput[]
    id?: StringFilter<"CodingAttempt"> | string
    associateId?: IntFilter<"CodingAttempt"> | number
    challengeId?: StringFilter<"CodingAttempt"> | string
    submittedCode?: StringFilter<"CodingAttempt"> | string
    language?: StringFilter<"CodingAttempt"> | string
    verdict?: StringFilter<"CodingAttempt"> | string
    visibleTestResults?: JsonFilter<"CodingAttempt">
    hiddenTestResults?: JsonFilter<"CodingAttempt">
    score?: FloatNullableFilter<"CodingAttempt"> | number | null
    judge0Token?: StringNullableFilter<"CodingAttempt"> | string | null
    submittedAt?: DateTimeFilter<"CodingAttempt"> | Date | string
    completedAt?: DateTimeNullableFilter<"CodingAttempt"> | Date | string | null
  }

  export type AssociateCreateWithoutSessionsInput = {
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohort?: CohortCreateNestedOneWithoutAssociatesInput
    gapScores?: GapScoreCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUncheckedCreateWithoutSessionsInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohortId?: number | null
    gapScores?: GapScoreUncheckedCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptUncheckedCreateNestedManyWithoutAssociateInput
  }

  export type AssociateCreateOrConnectWithoutSessionsInput = {
    where: AssociateWhereUniqueInput
    create: XOR<AssociateCreateWithoutSessionsInput, AssociateUncheckedCreateWithoutSessionsInput>
  }

  export type CohortCreateWithoutSessionsInput = {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeCreateNestedManyWithoutCohortInput
  }

  export type CohortUncheckedCreateWithoutSessionsInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateUncheckedCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekUncheckedCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeUncheckedCreateNestedManyWithoutCohortInput
  }

  export type CohortCreateOrConnectWithoutSessionsInput = {
    where: CohortWhereUniqueInput
    create: XOR<CohortCreateWithoutSessionsInput, CohortUncheckedCreateWithoutSessionsInput>
  }

  export type AssociateUpsertWithoutSessionsInput = {
    update: XOR<AssociateUpdateWithoutSessionsInput, AssociateUncheckedUpdateWithoutSessionsInput>
    create: XOR<AssociateCreateWithoutSessionsInput, AssociateUncheckedCreateWithoutSessionsInput>
    where?: AssociateWhereInput
  }

  export type AssociateUpdateToOneWithWhereWithoutSessionsInput = {
    where?: AssociateWhereInput
    data: XOR<AssociateUpdateWithoutSessionsInput, AssociateUncheckedUpdateWithoutSessionsInput>
  }

  export type AssociateUpdateWithoutSessionsInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohort?: CohortUpdateOneWithoutAssociatesNestedInput
    gapScores?: GapScoreUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateWithoutSessionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    gapScores?: GapScoreUncheckedUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUncheckedUpdateManyWithoutAssociateNestedInput
  }

  export type CohortUpsertWithoutSessionsInput = {
    update: XOR<CohortUpdateWithoutSessionsInput, CohortUncheckedUpdateWithoutSessionsInput>
    create: XOR<CohortCreateWithoutSessionsInput, CohortUncheckedCreateWithoutSessionsInput>
    where?: CohortWhereInput
  }

  export type CohortUpdateToOneWithWhereWithoutSessionsInput = {
    where?: CohortWhereInput
    data: XOR<CohortUpdateWithoutSessionsInput, CohortUncheckedUpdateWithoutSessionsInput>
  }

  export type CohortUpdateWithoutSessionsInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUpdateManyWithoutCohortNestedInput
  }

  export type CohortUncheckedUpdateWithoutSessionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUncheckedUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUncheckedUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUncheckedUpdateManyWithoutCohortNestedInput
  }

  export type AssociateCreateWithoutGapScoresInput = {
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohort?: CohortCreateNestedOneWithoutAssociatesInput
    sessions?: SessionCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUncheckedCreateWithoutGapScoresInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohortId?: number | null
    sessions?: SessionUncheckedCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptUncheckedCreateNestedManyWithoutAssociateInput
  }

  export type AssociateCreateOrConnectWithoutGapScoresInput = {
    where: AssociateWhereUniqueInput
    create: XOR<AssociateCreateWithoutGapScoresInput, AssociateUncheckedCreateWithoutGapScoresInput>
  }

  export type AssociateUpsertWithoutGapScoresInput = {
    update: XOR<AssociateUpdateWithoutGapScoresInput, AssociateUncheckedUpdateWithoutGapScoresInput>
    create: XOR<AssociateCreateWithoutGapScoresInput, AssociateUncheckedCreateWithoutGapScoresInput>
    where?: AssociateWhereInput
  }

  export type AssociateUpdateToOneWithWhereWithoutGapScoresInput = {
    where?: AssociateWhereInput
    data: XOR<AssociateUpdateWithoutGapScoresInput, AssociateUncheckedUpdateWithoutGapScoresInput>
  }

  export type AssociateUpdateWithoutGapScoresInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohort?: CohortUpdateOneWithoutAssociatesNestedInput
    sessions?: SessionUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateWithoutGapScoresInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    sessions?: SessionUncheckedUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUncheckedUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateCreateWithoutCohortInput = {
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    sessions?: SessionCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUncheckedCreateWithoutCohortInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreUncheckedCreateNestedManyWithoutAssociateInput
    codingAttempts?: CodingAttemptUncheckedCreateNestedManyWithoutAssociateInput
  }

  export type AssociateCreateOrConnectWithoutCohortInput = {
    where: AssociateWhereUniqueInput
    create: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput>
  }

  export type AssociateCreateManyCohortInputEnvelope = {
    data: AssociateCreateManyCohortInput | AssociateCreateManyCohortInput[]
    skipDuplicates?: boolean
  }

  export type SessionCreateWithoutCohortInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    associate?: AssociateCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateWithoutCohortInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutCohortInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput>
  }

  export type SessionCreateManyCohortInputEnvelope = {
    data: SessionCreateManyCohortInput | SessionCreateManyCohortInput[]
    skipDuplicates?: boolean
  }

  export type CurriculumWeekCreateWithoutCohortInput = {
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
  }

  export type CurriculumWeekUncheckedCreateWithoutCohortInput = {
    id?: number
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
  }

  export type CurriculumWeekCreateOrConnectWithoutCohortInput = {
    where: CurriculumWeekWhereUniqueInput
    create: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput>
  }

  export type CurriculumWeekCreateManyCohortInputEnvelope = {
    data: CurriculumWeekCreateManyCohortInput | CurriculumWeekCreateManyCohortInput[]
    skipDuplicates?: boolean
  }

  export type CodingChallengeCreateWithoutCohortInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attempts?: CodingAttemptCreateNestedManyWithoutChallengeInput
    testCases?: CodingTestCaseCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeUncheckedCreateWithoutCohortInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attempts?: CodingAttemptUncheckedCreateNestedManyWithoutChallengeInput
    testCases?: CodingTestCaseUncheckedCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeCreateOrConnectWithoutCohortInput = {
    where: CodingChallengeWhereUniqueInput
    create: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput>
  }

  export type CodingChallengeCreateManyCohortInputEnvelope = {
    data: CodingChallengeCreateManyCohortInput | CodingChallengeCreateManyCohortInput[]
    skipDuplicates?: boolean
  }

  export type AssociateUpsertWithWhereUniqueWithoutCohortInput = {
    where: AssociateWhereUniqueInput
    update: XOR<AssociateUpdateWithoutCohortInput, AssociateUncheckedUpdateWithoutCohortInput>
    create: XOR<AssociateCreateWithoutCohortInput, AssociateUncheckedCreateWithoutCohortInput>
  }

  export type AssociateUpdateWithWhereUniqueWithoutCohortInput = {
    where: AssociateWhereUniqueInput
    data: XOR<AssociateUpdateWithoutCohortInput, AssociateUncheckedUpdateWithoutCohortInput>
  }

  export type AssociateUpdateManyWithWhereWithoutCohortInput = {
    where: AssociateScalarWhereInput
    data: XOR<AssociateUpdateManyMutationInput, AssociateUncheckedUpdateManyWithoutCohortInput>
  }

  export type AssociateScalarWhereInput = {
    AND?: AssociateScalarWhereInput | AssociateScalarWhereInput[]
    OR?: AssociateScalarWhereInput[]
    NOT?: AssociateScalarWhereInput | AssociateScalarWhereInput[]
    id?: IntFilter<"Associate"> | number
    slug?: StringFilter<"Associate"> | string
    displayName?: StringNullableFilter<"Associate"> | string | null
    createdAt?: DateTimeFilter<"Associate"> | Date | string
    updatedAt?: DateTimeFilter<"Associate"> | Date | string
    readinessStatus?: StringNullableFilter<"Associate"> | string | null
    recommendedArea?: StringNullableFilter<"Associate"> | string | null
    lastComputedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    email?: StringNullableFilter<"Associate"> | string | null
    authUserId?: StringNullableFilter<"Associate"> | string | null
    lastInvitedAt?: DateTimeNullableFilter<"Associate"> | Date | string | null
    cohortId?: IntNullableFilter<"Associate"> | number | null
  }

  export type SessionUpsertWithWhereUniqueWithoutCohortInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutCohortInput, SessionUncheckedUpdateWithoutCohortInput>
    create: XOR<SessionCreateWithoutCohortInput, SessionUncheckedCreateWithoutCohortInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutCohortInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutCohortInput, SessionUncheckedUpdateWithoutCohortInput>
  }

  export type SessionUpdateManyWithWhereWithoutCohortInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutCohortInput>
  }

  export type CurriculumWeekUpsertWithWhereUniqueWithoutCohortInput = {
    where: CurriculumWeekWhereUniqueInput
    update: XOR<CurriculumWeekUpdateWithoutCohortInput, CurriculumWeekUncheckedUpdateWithoutCohortInput>
    create: XOR<CurriculumWeekCreateWithoutCohortInput, CurriculumWeekUncheckedCreateWithoutCohortInput>
  }

  export type CurriculumWeekUpdateWithWhereUniqueWithoutCohortInput = {
    where: CurriculumWeekWhereUniqueInput
    data: XOR<CurriculumWeekUpdateWithoutCohortInput, CurriculumWeekUncheckedUpdateWithoutCohortInput>
  }

  export type CurriculumWeekUpdateManyWithWhereWithoutCohortInput = {
    where: CurriculumWeekScalarWhereInput
    data: XOR<CurriculumWeekUpdateManyMutationInput, CurriculumWeekUncheckedUpdateManyWithoutCohortInput>
  }

  export type CurriculumWeekScalarWhereInput = {
    AND?: CurriculumWeekScalarWhereInput | CurriculumWeekScalarWhereInput[]
    OR?: CurriculumWeekScalarWhereInput[]
    NOT?: CurriculumWeekScalarWhereInput | CurriculumWeekScalarWhereInput[]
    id?: IntFilter<"CurriculumWeek"> | number
    cohortId?: IntFilter<"CurriculumWeek"> | number
    weekNumber?: IntFilter<"CurriculumWeek"> | number
    skillName?: StringFilter<"CurriculumWeek"> | string
    skillSlug?: StringFilter<"CurriculumWeek"> | string
    topicTags?: StringNullableListFilter<"CurriculumWeek">
    startDate?: DateTimeFilter<"CurriculumWeek"> | Date | string
  }

  export type CodingChallengeUpsertWithWhereUniqueWithoutCohortInput = {
    where: CodingChallengeWhereUniqueInput
    update: XOR<CodingChallengeUpdateWithoutCohortInput, CodingChallengeUncheckedUpdateWithoutCohortInput>
    create: XOR<CodingChallengeCreateWithoutCohortInput, CodingChallengeUncheckedCreateWithoutCohortInput>
  }

  export type CodingChallengeUpdateWithWhereUniqueWithoutCohortInput = {
    where: CodingChallengeWhereUniqueInput
    data: XOR<CodingChallengeUpdateWithoutCohortInput, CodingChallengeUncheckedUpdateWithoutCohortInput>
  }

  export type CodingChallengeUpdateManyWithWhereWithoutCohortInput = {
    where: CodingChallengeScalarWhereInput
    data: XOR<CodingChallengeUpdateManyMutationInput, CodingChallengeUncheckedUpdateManyWithoutCohortInput>
  }

  export type CodingChallengeScalarWhereInput = {
    AND?: CodingChallengeScalarWhereInput | CodingChallengeScalarWhereInput[]
    OR?: CodingChallengeScalarWhereInput[]
    NOT?: CodingChallengeScalarWhereInput | CodingChallengeScalarWhereInput[]
    id?: StringFilter<"CodingChallenge"> | string
    slug?: StringFilter<"CodingChallenge"> | string
    title?: StringFilter<"CodingChallenge"> | string
    language?: StringFilter<"CodingChallenge"> | string
    difficulty?: StringFilter<"CodingChallenge"> | string
    description?: StringFilter<"CodingChallenge"> | string
    skillSlug?: StringFilter<"CodingChallenge"> | string
    cohortId?: IntNullableFilter<"CodingChallenge"> | number | null
    createdAt?: DateTimeFilter<"CodingChallenge"> | Date | string
    updatedAt?: DateTimeFilter<"CodingChallenge"> | Date | string
  }

  export type CohortCreateWithoutCurriculumWeeksInput = {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateCreateNestedManyWithoutCohortInput
    sessions?: SessionCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeCreateNestedManyWithoutCohortInput
  }

  export type CohortUncheckedCreateWithoutCurriculumWeeksInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateUncheckedCreateNestedManyWithoutCohortInput
    sessions?: SessionUncheckedCreateNestedManyWithoutCohortInput
    codingChallenges?: CodingChallengeUncheckedCreateNestedManyWithoutCohortInput
  }

  export type CohortCreateOrConnectWithoutCurriculumWeeksInput = {
    where: CohortWhereUniqueInput
    create: XOR<CohortCreateWithoutCurriculumWeeksInput, CohortUncheckedCreateWithoutCurriculumWeeksInput>
  }

  export type CohortUpsertWithoutCurriculumWeeksInput = {
    update: XOR<CohortUpdateWithoutCurriculumWeeksInput, CohortUncheckedUpdateWithoutCurriculumWeeksInput>
    create: XOR<CohortCreateWithoutCurriculumWeeksInput, CohortUncheckedCreateWithoutCurriculumWeeksInput>
    where?: CohortWhereInput
  }

  export type CohortUpdateToOneWithWhereWithoutCurriculumWeeksInput = {
    where?: CohortWhereInput
    data: XOR<CohortUpdateWithoutCurriculumWeeksInput, CohortUncheckedUpdateWithoutCurriculumWeeksInput>
  }

  export type CohortUpdateWithoutCurriculumWeeksInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUpdateManyWithoutCohortNestedInput
    sessions?: SessionUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUpdateManyWithoutCohortNestedInput
  }

  export type CohortUncheckedUpdateWithoutCurriculumWeeksInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUncheckedUpdateManyWithoutCohortNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutCohortNestedInput
    codingChallenges?: CodingChallengeUncheckedUpdateManyWithoutCohortNestedInput
  }

  export type CohortCreateWithoutCodingChallengesInput = {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateCreateNestedManyWithoutCohortInput
    sessions?: SessionCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekCreateNestedManyWithoutCohortInput
  }

  export type CohortUncheckedCreateWithoutCodingChallengesInput = {
    id?: number
    name: string
    startDate: Date | string
    endDate?: Date | string | null
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    associates?: AssociateUncheckedCreateNestedManyWithoutCohortInput
    sessions?: SessionUncheckedCreateNestedManyWithoutCohortInput
    curriculumWeeks?: CurriculumWeekUncheckedCreateNestedManyWithoutCohortInput
  }

  export type CohortCreateOrConnectWithoutCodingChallengesInput = {
    where: CohortWhereUniqueInput
    create: XOR<CohortCreateWithoutCodingChallengesInput, CohortUncheckedCreateWithoutCodingChallengesInput>
  }

  export type CodingAttemptCreateWithoutChallengeInput = {
    id?: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    associate: AssociateCreateNestedOneWithoutCodingAttemptsInput
    signal?: CodingSkillSignalCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptUncheckedCreateWithoutChallengeInput = {
    id?: string
    associateId: number
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    signal?: CodingSkillSignalUncheckedCreateNestedOneWithoutAttemptInput
  }

  export type CodingAttemptCreateOrConnectWithoutChallengeInput = {
    where: CodingAttemptWhereUniqueInput
    create: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput>
  }

  export type CodingAttemptCreateManyChallengeInputEnvelope = {
    data: CodingAttemptCreateManyChallengeInput | CodingAttemptCreateManyChallengeInput[]
    skipDuplicates?: boolean
  }

  export type CodingTestCaseCreateWithoutChallengeInput = {
    id?: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
  }

  export type CodingTestCaseUncheckedCreateWithoutChallengeInput = {
    id?: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
  }

  export type CodingTestCaseCreateOrConnectWithoutChallengeInput = {
    where: CodingTestCaseWhereUniqueInput
    create: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput>
  }

  export type CodingTestCaseCreateManyChallengeInputEnvelope = {
    data: CodingTestCaseCreateManyChallengeInput | CodingTestCaseCreateManyChallengeInput[]
    skipDuplicates?: boolean
  }

  export type CohortUpsertWithoutCodingChallengesInput = {
    update: XOR<CohortUpdateWithoutCodingChallengesInput, CohortUncheckedUpdateWithoutCodingChallengesInput>
    create: XOR<CohortCreateWithoutCodingChallengesInput, CohortUncheckedCreateWithoutCodingChallengesInput>
    where?: CohortWhereInput
  }

  export type CohortUpdateToOneWithWhereWithoutCodingChallengesInput = {
    where?: CohortWhereInput
    data: XOR<CohortUpdateWithoutCodingChallengesInput, CohortUncheckedUpdateWithoutCodingChallengesInput>
  }

  export type CohortUpdateWithoutCodingChallengesInput = {
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUpdateManyWithoutCohortNestedInput
    sessions?: SessionUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUpdateManyWithoutCohortNestedInput
  }

  export type CohortUncheckedUpdateWithoutCodingChallengesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associates?: AssociateUncheckedUpdateManyWithoutCohortNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutCohortNestedInput
    curriculumWeeks?: CurriculumWeekUncheckedUpdateManyWithoutCohortNestedInput
  }

  export type CodingAttemptUpsertWithWhereUniqueWithoutChallengeInput = {
    where: CodingAttemptWhereUniqueInput
    update: XOR<CodingAttemptUpdateWithoutChallengeInput, CodingAttemptUncheckedUpdateWithoutChallengeInput>
    create: XOR<CodingAttemptCreateWithoutChallengeInput, CodingAttemptUncheckedCreateWithoutChallengeInput>
  }

  export type CodingAttemptUpdateWithWhereUniqueWithoutChallengeInput = {
    where: CodingAttemptWhereUniqueInput
    data: XOR<CodingAttemptUpdateWithoutChallengeInput, CodingAttemptUncheckedUpdateWithoutChallengeInput>
  }

  export type CodingAttemptUpdateManyWithWhereWithoutChallengeInput = {
    where: CodingAttemptScalarWhereInput
    data: XOR<CodingAttemptUpdateManyMutationInput, CodingAttemptUncheckedUpdateManyWithoutChallengeInput>
  }

  export type CodingTestCaseUpsertWithWhereUniqueWithoutChallengeInput = {
    where: CodingTestCaseWhereUniqueInput
    update: XOR<CodingTestCaseUpdateWithoutChallengeInput, CodingTestCaseUncheckedUpdateWithoutChallengeInput>
    create: XOR<CodingTestCaseCreateWithoutChallengeInput, CodingTestCaseUncheckedCreateWithoutChallengeInput>
  }

  export type CodingTestCaseUpdateWithWhereUniqueWithoutChallengeInput = {
    where: CodingTestCaseWhereUniqueInput
    data: XOR<CodingTestCaseUpdateWithoutChallengeInput, CodingTestCaseUncheckedUpdateWithoutChallengeInput>
  }

  export type CodingTestCaseUpdateManyWithWhereWithoutChallengeInput = {
    where: CodingTestCaseScalarWhereInput
    data: XOR<CodingTestCaseUpdateManyMutationInput, CodingTestCaseUncheckedUpdateManyWithoutChallengeInput>
  }

  export type CodingTestCaseScalarWhereInput = {
    AND?: CodingTestCaseScalarWhereInput | CodingTestCaseScalarWhereInput[]
    OR?: CodingTestCaseScalarWhereInput[]
    NOT?: CodingTestCaseScalarWhereInput | CodingTestCaseScalarWhereInput[]
    id?: StringFilter<"CodingTestCase"> | string
    challengeId?: StringFilter<"CodingTestCase"> | string
    isHidden?: BoolFilter<"CodingTestCase"> | boolean
    stdin?: StringFilter<"CodingTestCase"> | string
    expectedStdout?: StringFilter<"CodingTestCase"> | string
    weight?: FloatFilter<"CodingTestCase"> | number
    orderIndex?: IntFilter<"CodingTestCase"> | number
  }

  export type AssociateCreateWithoutCodingAttemptsInput = {
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohort?: CohortCreateNestedOneWithoutAssociatesInput
    sessions?: SessionCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreCreateNestedManyWithoutAssociateInput
  }

  export type AssociateUncheckedCreateWithoutCodingAttemptsInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
    cohortId?: number | null
    sessions?: SessionUncheckedCreateNestedManyWithoutAssociateInput
    gapScores?: GapScoreUncheckedCreateNestedManyWithoutAssociateInput
  }

  export type AssociateCreateOrConnectWithoutCodingAttemptsInput = {
    where: AssociateWhereUniqueInput
    create: XOR<AssociateCreateWithoutCodingAttemptsInput, AssociateUncheckedCreateWithoutCodingAttemptsInput>
  }

  export type CodingChallengeCreateWithoutAttemptsInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cohort?: CohortCreateNestedOneWithoutCodingChallengesInput
    testCases?: CodingTestCaseCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeUncheckedCreateWithoutAttemptsInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    cohortId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    testCases?: CodingTestCaseUncheckedCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeCreateOrConnectWithoutAttemptsInput = {
    where: CodingChallengeWhereUniqueInput
    create: XOR<CodingChallengeCreateWithoutAttemptsInput, CodingChallengeUncheckedCreateWithoutAttemptsInput>
  }

  export type CodingSkillSignalCreateWithoutAttemptInput = {
    id?: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
  }

  export type CodingSkillSignalUncheckedCreateWithoutAttemptInput = {
    id?: string
    skillSlug: string
    signalType: string
    weight: number
    mappedScore: number
  }

  export type CodingSkillSignalCreateOrConnectWithoutAttemptInput = {
    where: CodingSkillSignalWhereUniqueInput
    create: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
  }

  export type AssociateUpsertWithoutCodingAttemptsInput = {
    update: XOR<AssociateUpdateWithoutCodingAttemptsInput, AssociateUncheckedUpdateWithoutCodingAttemptsInput>
    create: XOR<AssociateCreateWithoutCodingAttemptsInput, AssociateUncheckedCreateWithoutCodingAttemptsInput>
    where?: AssociateWhereInput
  }

  export type AssociateUpdateToOneWithWhereWithoutCodingAttemptsInput = {
    where?: AssociateWhereInput
    data: XOR<AssociateUpdateWithoutCodingAttemptsInput, AssociateUncheckedUpdateWithoutCodingAttemptsInput>
  }

  export type AssociateUpdateWithoutCodingAttemptsInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohort?: CohortUpdateOneWithoutAssociatesNestedInput
    sessions?: SessionUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateWithoutCodingAttemptsInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    sessions?: SessionUncheckedUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUncheckedUpdateManyWithoutAssociateNestedInput
  }

  export type CodingChallengeUpsertWithoutAttemptsInput = {
    update: XOR<CodingChallengeUpdateWithoutAttemptsInput, CodingChallengeUncheckedUpdateWithoutAttemptsInput>
    create: XOR<CodingChallengeCreateWithoutAttemptsInput, CodingChallengeUncheckedCreateWithoutAttemptsInput>
    where?: CodingChallengeWhereInput
  }

  export type CodingChallengeUpdateToOneWithWhereWithoutAttemptsInput = {
    where?: CodingChallengeWhereInput
    data: XOR<CodingChallengeUpdateWithoutAttemptsInput, CodingChallengeUncheckedUpdateWithoutAttemptsInput>
  }

  export type CodingChallengeUpdateWithoutAttemptsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cohort?: CohortUpdateOneWithoutCodingChallengesNestedInput
    testCases?: CodingTestCaseUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeUncheckedUpdateWithoutAttemptsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    testCases?: CodingTestCaseUncheckedUpdateManyWithoutChallengeNestedInput
  }

  export type CodingSkillSignalUpsertWithoutAttemptInput = {
    update: XOR<CodingSkillSignalUpdateWithoutAttemptInput, CodingSkillSignalUncheckedUpdateWithoutAttemptInput>
    create: XOR<CodingSkillSignalCreateWithoutAttemptInput, CodingSkillSignalUncheckedCreateWithoutAttemptInput>
    where?: CodingSkillSignalWhereInput
  }

  export type CodingSkillSignalUpdateToOneWithWhereWithoutAttemptInput = {
    where?: CodingSkillSignalWhereInput
    data: XOR<CodingSkillSignalUpdateWithoutAttemptInput, CodingSkillSignalUncheckedUpdateWithoutAttemptInput>
  }

  export type CodingSkillSignalUpdateWithoutAttemptInput = {
    id?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
  }

  export type CodingSkillSignalUncheckedUpdateWithoutAttemptInput = {
    id?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    mappedScore?: FloatFieldUpdateOperationsInput | number
  }

  export type CodingChallengeCreateWithoutTestCasesInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    cohort?: CohortCreateNestedOneWithoutCodingChallengesInput
    attempts?: CodingAttemptCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeUncheckedCreateWithoutTestCasesInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    cohortId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    attempts?: CodingAttemptUncheckedCreateNestedManyWithoutChallengeInput
  }

  export type CodingChallengeCreateOrConnectWithoutTestCasesInput = {
    where: CodingChallengeWhereUniqueInput
    create: XOR<CodingChallengeCreateWithoutTestCasesInput, CodingChallengeUncheckedCreateWithoutTestCasesInput>
  }

  export type CodingChallengeUpsertWithoutTestCasesInput = {
    update: XOR<CodingChallengeUpdateWithoutTestCasesInput, CodingChallengeUncheckedUpdateWithoutTestCasesInput>
    create: XOR<CodingChallengeCreateWithoutTestCasesInput, CodingChallengeUncheckedCreateWithoutTestCasesInput>
    where?: CodingChallengeWhereInput
  }

  export type CodingChallengeUpdateToOneWithWhereWithoutTestCasesInput = {
    where?: CodingChallengeWhereInput
    data: XOR<CodingChallengeUpdateWithoutTestCasesInput, CodingChallengeUncheckedUpdateWithoutTestCasesInput>
  }

  export type CodingChallengeUpdateWithoutTestCasesInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cohort?: CohortUpdateOneWithoutCodingChallengesNestedInput
    attempts?: CodingAttemptUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeUncheckedUpdateWithoutTestCasesInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: CodingAttemptUncheckedUpdateManyWithoutChallengeNestedInput
  }

  export type CodingAttemptCreateWithoutSignalInput = {
    id?: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
    associate: AssociateCreateNestedOneWithoutCodingAttemptsInput
    challenge: CodingChallengeCreateNestedOneWithoutAttemptsInput
  }

  export type CodingAttemptUncheckedCreateWithoutSignalInput = {
    id?: string
    associateId: number
    challengeId: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type CodingAttemptCreateOrConnectWithoutSignalInput = {
    where: CodingAttemptWhereUniqueInput
    create: XOR<CodingAttemptCreateWithoutSignalInput, CodingAttemptUncheckedCreateWithoutSignalInput>
  }

  export type CodingAttemptUpsertWithoutSignalInput = {
    update: XOR<CodingAttemptUpdateWithoutSignalInput, CodingAttemptUncheckedUpdateWithoutSignalInput>
    create: XOR<CodingAttemptCreateWithoutSignalInput, CodingAttemptUncheckedCreateWithoutSignalInput>
    where?: CodingAttemptWhereInput
  }

  export type CodingAttemptUpdateToOneWithWhereWithoutSignalInput = {
    where?: CodingAttemptWhereInput
    data: XOR<CodingAttemptUpdateWithoutSignalInput, CodingAttemptUncheckedUpdateWithoutSignalInput>
  }

  export type CodingAttemptUpdateWithoutSignalInput = {
    id?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    associate?: AssociateUpdateOneRequiredWithoutCodingAttemptsNestedInput
    challenge?: CodingChallengeUpdateOneRequiredWithoutAttemptsNestedInput
  }

  export type CodingAttemptUncheckedUpdateWithoutSignalInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    challengeId?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SessionCreateManyAssociateInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    cohortId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GapScoreCreateManyAssociateInput = {
    id?: string
    skill: string
    topic?: string
    weightedScore: number
    prevWeightedScore?: number | null
    sessionCount: number
    lastUpdated?: Date | string
  }

  export type CodingAttemptCreateManyAssociateInput = {
    id?: string
    challengeId: string
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type SessionUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    cohort?: CohortUpdateOneWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    cohortId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreUncheckedUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GapScoreUncheckedUpdateManyWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    weightedScore?: FloatFieldUpdateOperationsInput | number
    prevWeightedScore?: NullableFloatFieldUpdateOperationsInput | number | null
    sessionCount?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingAttemptUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    challenge?: CodingChallengeUpdateOneRequiredWithoutAttemptsNestedInput
    signal?: CodingSkillSignalUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptUncheckedUpdateWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    challengeId?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    signal?: CodingSkillSignalUncheckedUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptUncheckedUpdateManyWithoutAssociateInput = {
    id?: StringFieldUpdateOperationsInput | string
    challengeId?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AssociateCreateManyCohortInput = {
    id?: number
    slug: string
    displayName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    readinessStatus?: string | null
    recommendedArea?: string | null
    lastComputedAt?: Date | string | null
    email?: string | null
    authUserId?: string | null
    lastInvitedAt?: Date | string | null
  }

  export type SessionCreateManyCohortInput = {
    id: string
    candidateName?: string | null
    interviewerName?: string | null
    date: string
    status: string
    questionCount: number
    selectedWeeks: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: number | null
    overallSoftSkillScore?: number | null
    technicalFeedback?: string | null
    softSkillFeedback?: string | null
    questions: JsonNullValueInput | InputJsonValue
    starterQuestions: JsonNullValueInput | InputJsonValue
    assessments: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: number | null
    aiTrainerVariance?: number | null
    mode?: string
    readinessRecomputeStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CurriculumWeekCreateManyCohortInput = {
    id?: number
    weekNumber: number
    skillName: string
    skillSlug: string
    topicTags?: CurriculumWeekCreatetopicTagsInput | string[]
    startDate: Date | string
  }

  export type CodingChallengeCreateManyCohortInput = {
    id?: string
    slug: string
    title: string
    language: string
    difficulty: string
    description: string
    skillSlug: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AssociateUpdateWithoutCohortInput = {
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: SessionUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateWithoutCohortInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sessions?: SessionUncheckedUpdateManyWithoutAssociateNestedInput
    gapScores?: GapScoreUncheckedUpdateManyWithoutAssociateNestedInput
    codingAttempts?: CodingAttemptUncheckedUpdateManyWithoutAssociateNestedInput
  }

  export type AssociateUncheckedUpdateManyWithoutCohortInput = {
    id?: IntFieldUpdateOperationsInput | number
    slug?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    readinessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    recommendedArea?: NullableStringFieldUpdateOperationsInput | string | null
    lastComputedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    authUserId?: NullableStringFieldUpdateOperationsInput | string | null
    lastInvitedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SessionUpdateWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    associate?: AssociateUpdateOneWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    candidateName?: NullableStringFieldUpdateOperationsInput | string | null
    interviewerName?: NullableStringFieldUpdateOperationsInput | string | null
    date?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    questionCount?: IntFieldUpdateOperationsInput | number
    selectedWeeks?: JsonNullValueInput | InputJsonValue
    overallTechnicalScore?: NullableFloatFieldUpdateOperationsInput | number | null
    overallSoftSkillScore?: NullableFloatFieldUpdateOperationsInput | number | null
    technicalFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    softSkillFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: JsonNullValueInput | InputJsonValue
    starterQuestions?: JsonNullValueInput | InputJsonValue
    assessments?: JsonNullValueInput | InputJsonValue
    techMap?: NullableJsonNullValueInput | InputJsonValue
    associateId?: NullableIntFieldUpdateOperationsInput | number | null
    aiTrainerVariance?: NullableFloatFieldUpdateOperationsInput | number | null
    mode?: StringFieldUpdateOperationsInput | string
    readinessRecomputeStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekUpdateWithoutCohortInput = {
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekUncheckedUpdateWithoutCohortInput = {
    id?: IntFieldUpdateOperationsInput | number
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CurriculumWeekUncheckedUpdateManyWithoutCohortInput = {
    id?: IntFieldUpdateOperationsInput | number
    weekNumber?: IntFieldUpdateOperationsInput | number
    skillName?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    topicTags?: CurriculumWeekUpdatetopicTagsInput | string[]
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingChallengeUpdateWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: CodingAttemptUpdateManyWithoutChallengeNestedInput
    testCases?: CodingTestCaseUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeUncheckedUpdateWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attempts?: CodingAttemptUncheckedUpdateManyWithoutChallengeNestedInput
    testCases?: CodingTestCaseUncheckedUpdateManyWithoutChallengeNestedInput
  }

  export type CodingChallengeUncheckedUpdateManyWithoutCohortInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    difficulty?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    skillSlug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CodingAttemptCreateManyChallengeInput = {
    id?: string
    associateId: number
    submittedCode: string
    language: string
    verdict?: string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: number | null
    judge0Token?: string | null
    submittedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type CodingTestCaseCreateManyChallengeInput = {
    id?: string
    isHidden?: boolean
    stdin: string
    expectedStdout: string
    weight?: number
    orderIndex?: number
  }

  export type CodingAttemptUpdateWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    associate?: AssociateUpdateOneRequiredWithoutCodingAttemptsNestedInput
    signal?: CodingSkillSignalUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptUncheckedUpdateWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    signal?: CodingSkillSignalUncheckedUpdateOneWithoutAttemptNestedInput
  }

  export type CodingAttemptUncheckedUpdateManyWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    associateId?: IntFieldUpdateOperationsInput | number
    submittedCode?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    verdict?: StringFieldUpdateOperationsInput | string
    visibleTestResults?: JsonNullValueInput | InputJsonValue
    hiddenTestResults?: JsonNullValueInput | InputJsonValue
    score?: NullableFloatFieldUpdateOperationsInput | number | null
    judge0Token?: NullableStringFieldUpdateOperationsInput | string | null
    submittedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CodingTestCaseUpdateWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }

  export type CodingTestCaseUncheckedUpdateWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }

  export type CodingTestCaseUncheckedUpdateManyWithoutChallengeInput = {
    id?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    stdin?: StringFieldUpdateOperationsInput | string
    expectedStdout?: StringFieldUpdateOperationsInput | string
    weight?: FloatFieldUpdateOperationsInput | number
    orderIndex?: IntFieldUpdateOperationsInput | number
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}