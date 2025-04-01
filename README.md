# TypeID-Drizzle-Zod

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-EBD85F?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=flat-square)

A lightweight, type-safe implementation of [TypeID](https://github.com/jetpack-io/typeid) with seamless integration for [Drizzle ORM](https://orm.drizzle.team/) and [Zod](https://zod.dev/) validation.

## Features

- 🔒 **Type-Safe IDs**: Prefix-based typed identifiers with compile-time type checking
- 🔄 **UUID Compatibility**: Store as standard UUIDs in your database while working with TypeIDs in your code
- 🔍 **Validation**: Built-in Zod validators for runtime type checking
- 🛠️ **Drizzle Integration**: Custom column type for Drizzle ORM
- 🧩 **Lightweight**: Zero bloat, focused implementation

## Getting Started

This is not a package to install, but rather a collection of utilities to copy into your project. To use TypeID-Drizzle-Zod in your own project:

### 1. Required Dependencies

First, install the necessary dependencies:

```bash
# Using npm
npm install typeid-js zod drizzle-orm

# Using yarn
yarn add typeid-js zod drizzle-orm

# Using pnpm
pnpm add typeid-js zod drizzle-orm

# Using bun
bun add typeid-js zod drizzle-orm
```

### 2. Copy the Core Code

Copy the contents of `index.ts` into your project. This contains all the core TypeID utilities including:
- Type definitions
- TypeID generator
- TypeID validators
- UUID conversion functions

### 3. Explore the Examples

Two example files are provided to demonstrate usage:

- **`example.ts`**: Shows basic TypeID operations without database integration
- **`example.drizzle.ts`**: Demonstrates complete integration with Drizzle ORM and database operations

These examples are intended as learning resources and starting points - you can adapt them to your specific use case.

## Quick Start

Once you've copied the code, you can use it like this:

```typescript
import { typeIdGenerator, typeIdValidator } from './path-to-your-typeid-file';

// Generate a new user ID
const userId = typeIdGenerator("user"); // e.g. usr_2ndbmsfgmfvkpbgc9t0qz8n78w

// Validate an ID string
const validator = typeIdValidator("user");
const result = validator.safeParse(userId);
if (result.success) {
  // Use the validated ID
  console.log(result.data); // Type is TypeId<'user'>
}
```

## Why TypeID?

TypeIDs combine the best of UUIDs and slugs:

- **Type Information**: Prefixes make it clear what type of entity an ID refers to
- **Type Safety**: TypeScript enforcement ensures you can't mix different ID types
- **Human Readability**: More readable than raw UUIDs
- **Database Compatibility**: Store as standard UUIDs in your database

## Usage with Drizzle ORM

The implementation provides seamless integration with Drizzle ORM. Copy this pattern into your schema files:

```typescript
import { pgTable, varchar, text } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { typeIdGenerator, typeIdFromUUID, typeIdToUUID, type TypeId } from './path-to-your-typeid-file';

// 1. Create a TypeID column type
const typeId = <T extends "user" | "post">(prefix: T, columnName: string) =>
  customType<{
    data: TypeId<T>;
    driverData: string;
  }>({
    dataType() {
      return "uuid";
    },
    fromDriver(value: string): TypeId<T> {
      return typeIdFromUUID(prefix, value);
    },
    toDriver(value: TypeId<T>): string {
      return typeIdToUUID(value).uuid;
    },
  })(columnName);

// 2. Use it in your schema
const usersTable = pgTable("users", {
  id: typeId("user", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("user")),
  email: varchar("email", { length: 255 }).notNull(),
  name: text("name"),
});

// 3. Query with TypeIDs
const user = await db.query.usersTable.findFirst({
  where: (users, { eq }) => eq(users.id, userId)
});
```

## Complete Example

The `example.drizzle.ts` file provides a comprehensive reference implementation showing:

- How to define a custom TypeID column type for Drizzle
- Creating tables with TypeID primary keys and foreign key relationships
- Inserting data with both auto-generated and manually specified TypeIDs
- Querying data with TypeIDs including joins between tables
- Converting between TypeIDs and UUIDs

To run the example:

```bash
# Using Bun
bun run example.drizzle.ts

# Using Node with ts-node
npx ts-node example.drizzle.ts
```

Examine the console output to see TypeIDs in action, both in their string form and when used in database operations.

## API Reference

### Core Functions

- `typeIdGenerator(prefix)`: Generates a new TypeID with the given prefix
- `typeIdValidator(prefix)`: Creates a Zod validator for the given prefix
- `validateTypeId(prefix, value)`: Type guard function to validate a TypeID
- `typeIdFromUUID(prefix, uuid)`: Converts a UUID to a TypeID
- `typeIdToUUID(typeId)`: Converts a TypeID back to a UUID
- `inferTypeId(typeId)`: Infers the type name from a TypeID string

### Types

- `TypeId<T>`: Branded type for type-safe IDs
- `IdTypePrefixNames`: Union type of all available ID type names

## License

MIT

## Acknowledgements

- [TypeID](https://github.com/jetpack-io/typeid) - The original TypeID specification
- [Drizzle ORM](https://orm.drizzle.team/) - The TypeScript database toolkit
- [Zod](https://zod.dev/) - TypeScript-first schema validation
