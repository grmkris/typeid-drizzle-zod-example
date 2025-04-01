import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { customType, pgTable, text, varchar, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import {
  typeIdGenerator,
  typeIdFromUUID,
  typeIdToUUID,
  type TypeId,
  type IdTypePrefixNames,
} from "./index";
import { randomUUID } from "node:crypto";

// ----------------------------------------------------
// 1. Set up custom TypeID column type for Drizzle
// ----------------------------------------------------

// Create a reusable TypeID column type generator
const typeId = <const T extends IdTypePrefixNames>(
  prefix: T,
  columnName: string
) =>
  customType<{
    data: TypeId<T>; // TypeScript type (when used in code)
    driverData: string; // How it's stored in the database (as a string/UUID)
  }>({
    dataType() {
      return "uuid"; // Store as UUID in the database
    },
    fromDriver(value: string): TypeId<T> {
      // Convert from database UUID format to TypeID format
      return typeIdFromUUID(prefix, value);
    },
    toDriver(value: TypeId<T>): string {
      // Convert from TypeID format to database UUID format
      return typeIdToUUID(value).uuid;
    },
  })(columnName);

// ----------------------------------------------------
// 2. Define schema with TypeID columns
// ----------------------------------------------------

// Users table with TypeID primary key
export const usersTable = pgTable("users", {
  id: typeId("user", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("user")), // Auto-generate TypeID
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

// Posts table with TypeID primary key and TypeID foreign key to users
export const postsTable = pgTable(
  "posts",
  {
    id: typeId("post", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("post")), // Auto-generate TypeID
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    authorId: typeId("user", "author_id")
      .notNull()
      .references(() => usersTable.id), // Foreign key to users
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => {
    return {
      authorIdx: index("post_author_idx").on(table.authorId), // Index on foreign key
    };
  }
);

// Comments table with TypeID primary key and TypeID foreign keys
export const commentsTable = pgTable(
  "comments",
  {
    id: typeId("comment", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("comment")), // Auto-generate TypeID
    content: text("content").notNull(),
    postId: typeId("post", "post_id")
      .notNull()
      .references(() => postsTable.id), // Foreign key to posts
    authorId: typeId("user", "author_id")
      .notNull()
      .references(() => usersTable.id), // Foreign key to users
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => {
    return {
      postIdx: index("comment_post_idx").on(table.postId),
      authorIdx: index("comment_author_idx").on(table.authorId),
    };
  }
);

// ----------------------------------------------------
// 3. Main function to demonstrate everything
// ----------------------------------------------------
async function main() {
  console.log("🚀 Starting TypeID + Drizzle + PGlite example...");

  // Initialize PGlite (in-memory database)
  const pglite = new PGlite();
  
  // Connect Drizzle ORM to the database
  const db = drizzle(pglite, { schema: { usersTable, postsTable, commentsTable } });

  // Create tables
  console.log("Creating tables...");
  await pglite.query(
    'CREATE TABLE IF NOT EXISTS users (\n' +
    '  id UUID PRIMARY KEY,\n' +
    '  email VARCHAR(255) UNIQUE NOT NULL,\n' +
    '  name VARCHAR(255),\n' +
    '  created_at TEXT\n' +
    ')'
  );

  await pglite.query(
    'CREATE TABLE IF NOT EXISTS posts (\n' +
    '  id UUID PRIMARY KEY,\n' +
    '  title VARCHAR(255) NOT NULL,\n' +
    '  content TEXT,\n' +
    '  author_id UUID REFERENCES users(id) NOT NULL,\n' +
    '  created_at TEXT\n' +
    ')'
  );

  await pglite.query(
    'CREATE TABLE IF NOT EXISTS comments (\n' +
    '  id UUID PRIMARY KEY,\n' +
    '  content TEXT NOT NULL,\n' +
    '  post_id UUID REFERENCES posts(id) NOT NULL,\n' +
    '  author_id UUID REFERENCES users(id) NOT NULL,\n' +
    '  created_at TEXT\n' +
    ')'
  );

  // Create indexes
  await pglite.query('CREATE INDEX IF NOT EXISTS post_author_idx ON posts(author_id)');
  await pglite.query('CREATE INDEX IF NOT EXISTS comment_post_idx ON comments(post_id)');
  await pglite.query('CREATE INDEX IF NOT EXISTS comment_author_idx ON comments(author_id)');

  // ----------------------------------------------------
  // 4. Insert data
  // ----------------------------------------------------
  console.log("\n📝 Inserting test data...");

  // Insert a user (TypeID will be auto-generated)
  const [user1] = await db.insert(usersTable)
    .values({
      email: "alice@example.com",
      name: "Alice"
    })
    .returning();

  console.log("Created user:", {
    id: user1.id,
    convertedToUUID: typeIdToUUID(user1.id).uuid,
    email: user1.email,
    name: user1.name,
  });

  // Insert another user with TypeID from an existing UUID
  const existingUUID = randomUUID();
  const manualUserId = typeIdFromUUID("user", existingUUID);
  
  const [user2] = await db.insert(usersTable)
    .values({
      id: manualUserId, // Provide the ID explicitly
      email: "bob@example.com",
      name: "Bob"
    })
    .returning();

  console.log("Created user with predefined UUID:", {
    id: user2.id,
    originalUUID: existingUUID,
    convertedBackUUID: typeIdToUUID(user2.id).uuid,
    idsMatch: existingUUID === typeIdToUUID(user2.id).uuid,
    email: user2.email,
  });

  // Insert posts for users
  const [post1] = await db.insert(postsTable)
    .values({
      title: "Alice's First Post",
      content: "Hello world from Alice!",
      authorId: user1.id // Use the TypeID directly
    })
    .returning();

  const [post2] = await db.insert(postsTable)
    .values({
      title: "Bob's Introduction",
      content: "Hello from Bob!",
      authorId: user2.id
    })
    .returning();

  console.log("Created posts:", {
    post1: {
      id: post1.id,
      title: post1.title,
      authorId: post1.authorId
    },
    post2: {
      id: post2.id,
      title: post2.title,
      authorId: post2.authorId
    }
  });

  // Insert comments
  const [comment1] = await db.insert(commentsTable)
    .values({
      content: "Great post, Alice!",
      postId: post1.id,
      authorId: user2.id // Bob comments on Alice's post
    })
    .returning();

  const [comment2] = await db.insert(commentsTable)
    .values({
      content: "Thanks Bob!",
      postId: post1.id,
      authorId: user1.id // Alice replies to her own post
    })
    .returning();

  console.log("Created comments:", {
    comment1: {
      id: comment1.id,
      content: comment1.content,
      postId: comment1.postId,
      authorId: comment1.authorId
    },
    comment2: {
      id: comment2.id,
      content: comment2.content,
      postId: comment2.postId,
      authorId: comment2.authorId
    }
  });

  // ----------------------------------------------------
  // 5. Query data with relations
  // ----------------------------------------------------
  console.log("\n🔍 Querying data with TypeID columns...");

  // Find all posts by a specific user
  const userPosts = await db.select()
    .from(postsTable)
    .where(eq(postsTable.authorId, user1.id)); // TypeID works in queries

  console.log(`Posts by ${user1.name} (${user1.id}):`);
  for (const post of userPosts) {
    console.log(`- [${post.id}] ${post.title}`);
  }

  // Find all comments on a specific post with authors
  const postComments = await db.select({
    commentId: commentsTable.id,
    content: commentsTable.content,
    authorName: usersTable.name,
    authorId: usersTable.id
  })
  .from(commentsTable)
  .where(eq(commentsTable.postId, post1.id))
  .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id));

  console.log(`\nComments on post "${post1.title}" (${post1.id}):`);
  for (const comment of postComments) {
    console.log(`- [${comment.commentId}] ${comment.content}`);
    console.log(`  By: ${comment.authorName} (${comment.authorId})`);
  }

  // ----------------------------------------------------
  // 6. Demonstrate TypeID validation
  // ----------------------------------------------------
  console.log("\n✅ TypeID validation demonstration:");

  // Example of how the TypeID stored in the database retains its type safety
  const foundPost = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, post1.id)
  });

  if (foundPost) {
    // The ID is strongly typed as TypeId<"post">
    const postTypeId = foundPost.id; 
    
    // We can access the UUID and prefix
    const { uuid, prefix } = typeIdToUUID(postTypeId);
    
    console.log("Found post with TypeID information:", {
      typedId: postTypeId,
      prefix: prefix, // Should be "pst"
      uuid: uuid,
    });

    // We can also create a TypeID from the UUID for a different type
    // Just for demonstration - normally you wouldn't convert between types
    const sameUuidDifferentType = typeIdFromUUID("comment", uuid);
    console.log("Same UUID with different type:", sameUuidDifferentType);
  }

  console.log("\n✨ Example completed successfully!");
}

// Run the example
main().catch(e => {
  console.error("Error in example:", e);
  process.exit(1);
}); 