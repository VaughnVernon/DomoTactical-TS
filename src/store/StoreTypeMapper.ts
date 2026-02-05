// Copyright © 2012-2025 Vaughn Vernon. All rights reserved.
// Copyright © 2012-2025 Kalele, Inc. All rights reserved.
//
// Licensed under the Reciprocal Public License 1.5
//
// See: LICENSE.md in repository root directory
// See: https://opensource.org/license/rpl-1-5

/**
 * Maps between type/class names and symbolic storage names.
 *
 * Provides bidirectional mapping for storage abstraction:
 * - Type name → Symbolic name (for writing to storage)
 * - Symbolic name → Type name (for reading from storage)
 *
 * A single `mapping()` registration creates both directions.
 *
 * When no explicit mapping is registered, uses convention-based conversion:
 * - PascalCase/CamelCase → kebab-case (e.g., `AccountOpened` → `account-opened`)
 * - kebab-case → PascalCase (e.g., `account-opened` → `AccountOpened`)
 *
 * @example
 * ```typescript
 * const mapper = StoreTypeMapper.instance()
 *
 * // Register explicit mapping (bidirectional)
 * mapper.mapping('AccountOpened', 'account-opened')
 * mapper.mapping('FundsDeposited', 'funds-deposited')
 *
 * // Use for writing (type → symbolic)
 * mapper.toSymbolicName('AccountOpened')  // 'account-opened'
 *
 * // Use for reading (symbolic → type)
 * mapper.toTypeName('account-opened')     // 'AccountOpened'
 *
 * // Implicit conversion (no registration needed)
 * mapper.toSymbolicName('UserRegistered') // 'user-registered'
 * mapper.toTypeName('user-registered')    // 'UserRegistered'
 * ```
 */
export class StoreTypeMapper {
  private static _instance: StoreTypeMapper | null = null

  /** Map from type name to symbolic name */
  private readonly typeToSymbolic = new Map<string, string>()

  /** Map from symbolic name to type name */
  private readonly symbolicToType = new Map<string, string>()

  /**
   * Construct a new StoreTypeMapper.
   * Use instance() for the singleton.
   */
  constructor() {}

  /**
   * Get the singleton instance.
   * Creates the instance on first call.
   *
   * @returns StoreTypeMapper the singleton instance
   */
  static instance(): StoreTypeMapper {
    if (!StoreTypeMapper._instance) {
      StoreTypeMapper._instance = new StoreTypeMapper()
    }
    return StoreTypeMapper._instance
  }

  /**
   * Reset the singleton instance (mainly for testing).
   * Clears all registered mappings.
   */
  static reset(): void {
    StoreTypeMapper._instance = null
  }

  /**
   * Register a bidirectional mapping between type name and symbolic name.
   *
   * A single call registers both directions:
   * - typeName → symbolicName (for writing)
   * - symbolicName → typeName (for reading)
   *
   * @param typeName the type/class name (e.g., 'AccountOpened')
   * @param symbolicName the symbolic storage name (e.g., 'account-opened')
   * @returns this for fluent chaining
   *
   * @example
   * ```typescript
   * mapper
   *   .mapping('AccountOpened', 'account-opened')
   *   .mapping('FundsDeposited', 'funds-deposited')
   *   .mapping('FundsWithdrawn', 'funds-withdrawn')
   * ```
   */
  mapping(typeName: string, symbolicName: string): this {
    this.typeToSymbolic.set(typeName, symbolicName)
    this.symbolicToType.set(symbolicName, typeName)
    return this
  }

  /**
   * Convert a type/class name to its symbolic storage name.
   *
   * Used when writing to storage (Journal or DocumentStore).
   *
   * If no explicit mapping is registered, converts using convention:
   * - PascalCase/CamelCase → kebab-case
   * - e.g., 'AccountOpened' → 'account-opened'
   *
   * @param typeName the type/class name
   * @returns string the symbolic name
   *
   * @example
   * ```typescript
   * // With explicit mapping
   * mapper.mapping('AccountOpened', 'acct-open')
   * mapper.toSymbolicName('AccountOpened')  // 'acct-open'
   *
   * // Without mapping (convention-based)
   * mapper.toSymbolicName('UserRegistered') // 'user-registered'
   * ```
   */
  toSymbolicName(typeName: string): string {
    const explicit = this.typeToSymbolic.get(typeName)
    if (explicit !== undefined) {
      return explicit
    }
    return this.pascalToKebab(typeName)
  }

  /**
   * Convert a symbolic storage name to its type/class name.
   *
   * Used when reading from storage (Journal or DocumentStore).
   *
   * If no explicit mapping is registered, converts using convention:
   * - kebab-case → PascalCase
   * - e.g., 'account-opened' → 'AccountOpened'
   *
   * @param symbolicName the symbolic storage name
   * @returns string the type/class name
   *
   * @example
   * ```typescript
   * // With explicit mapping
   * mapper.mapping('AccountOpened', 'acct-open')
   * mapper.toTypeName('acct-open')          // 'AccountOpened'
   *
   * // Without mapping (convention-based)
   * mapper.toTypeName('user-registered')    // 'UserRegistered'
   * ```
   */
  toTypeName(symbolicName: string): string {
    const explicit = this.symbolicToType.get(symbolicName)
    if (explicit !== undefined) {
      return explicit
    }
    return this.kebabToPascal(symbolicName)
  }

  /**
   * Check if an explicit mapping exists for a type name.
   *
   * @param typeName the type/class name
   * @returns boolean true if an explicit mapping is registered
   */
  hasTypeMapping(typeName: string): boolean {
    return this.typeToSymbolic.has(typeName)
  }

  /**
   * Check if an explicit mapping exists for a symbolic name.
   *
   * @param symbolicName the symbolic storage name
   * @returns boolean true if an explicit mapping is registered
   */
  hasSymbolicMapping(symbolicName: string): boolean {
    return this.symbolicToType.has(symbolicName)
  }

  /**
   * Convert PascalCase/CamelCase to kebab-case.
   *
   * Examples:
   * - 'AccountOpened' → 'account-opened'
   * - 'FundsDeposited' → 'funds-deposited'
   * - 'XMLParser' → 'xml-parser'
   * - 'Name' → 'name'
   *
   * @param str the PascalCase/CamelCase string
   * @returns string the kebab-case string
   */
  private pascalToKebab(str: string): string {
    if (!str) return str

    // Handle consecutive uppercase (e.g., XMLParser → xml-parser)
    // Insert hyphen before uppercase letters that are followed by lowercase
    // or before uppercase letters that follow lowercase letters
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  }

  /**
   * Convert kebab-case to PascalCase.
   *
   * Examples:
   * - 'account-opened' → 'AccountOpened'
   * - 'funds-deposited' → 'FundsDeposited'
   * - 'xml-parser' → 'XmlParser'
   * - 'name' → 'Name'
   *
   * @param str the kebab-case string
   * @returns string the PascalCase string
   */
  private kebabToPascal(str: string): string {
    if (!str) return str

    // Split on hyphens, capitalize each part, join
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('')
  }
}
