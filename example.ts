import {
  typeIdGenerator,
  typeIdValidator,
  validateTypeId,
  typeIdToUUID,
  typeIdFromUUID,
  inferTypeId,
} from "./index";
import { randomUUID } from "node:crypto"; // For generating example UUIDs

// --- Example Usage ---

// 1. Define your prefixes (usually done in index.ts, but shown here for context)
// const idTypesMapNameToPrefix = {
//   user: "usr",
//   post: "pst",
// } as const;

// 2. Generate a new TypeID for a specific type (e.g., 'user')
const newUserId = typeIdGenerator("user");
console.log("Generated User ID:", newUserId); // e.g., usr_01h4f3j3k2m1n3p4q5r6s7t8v9

// 3. Validate a TypeID string using the Zod validator
const userValidator = typeIdValidator("user");
const validationResult = userValidator.safeParse(newUserId);
console.log("Validation Result (Valid):", validationResult);
if (validationResult.success) {
  console.log("Validated User ID:", validationResult.data); // Type is TypeId<'user'>
}

const invalidId = "usr_invalid123";
const invalidResult = userValidator.safeParse(invalidId);
console.log("Validation Result (Invalid):", invalidResult);
if (!invalidResult.success) {
  console.log("Validation Errors:", invalidResult.error.errors);
}

// 4. Validate using the type guard function
const potentiallyUserId: unknown = newUserId;
if (validateTypeId("user", potentiallyUserId)) {
  // potentiallyUserId is now known to be TypeId<'user'> within this block
  console.log("Type guard validation passed:", potentiallyUserId);
} else {
  console.log("Type guard validation failed for:", potentiallyUserId);
}

const anotherInvalid: unknown = "post_123456789012345678901234";
if (validateTypeId("user", anotherInvalid)) {
  console.log("Type guard validation passed:", anotherInvalid);
} else {
  // Correctly fails because the prefix is wrong
  console.log("Type guard validation failed for:", anotherInvalid);
}

// 5. Convert a TypeID back to its UUID and prefix
const { uuid, prefix } = typeIdToUUID(newUserId);
console.log("Extracted UUID:", uuid);
console.log("Extracted Prefix:", prefix); // 'usr'

// 6. Create a TypeID from an existing UUID
const existingUUID = randomUUID(); // Generate a random UUID for example
const userIdFromExisting = typeIdFromUUID("user", existingUUID);
console.log("Generated User ID from existing UUID:", userIdFromExisting);
console.log("Check conversion back:", typeIdToUUID(userIdFromExisting).uuid === existingUUID); // true

// 7. Infer the type name from a TypeID string
const inferredType = inferTypeId(newUserId);
console.log("Inferred Type Name:", inferredType); // 'user'

const postIdExample = typeIdGenerator("post");
const inferredPostType = inferTypeId(postIdExample);
console.log("Inferred Type Name (Post):", inferredPostType); // 'post'
