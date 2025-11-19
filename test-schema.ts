
import { z } from "zod";

const markReadSchema = z.object({
    ids: z.array(z.union([z.number(), z.string().transform((val) => parseInt(val, 10))])).optional(),
    all: z.boolean().optional(),
});

function test() {
    console.log("Testing schema validation...");

    // Test 1: Array of numbers (standard case)
    const input1 = { ids: [1, 2, 3] };
    const result1 = markReadSchema.safeParse(input1);
    if (result1.success && result1.data.ids?.every(id => typeof id === 'number')) {
        console.log("PASS: Numbers array accepted");
    } else {
        console.error("FAIL: Numbers array failed", result1);
    }

    // Test 2: Array of strings (bug case)
    const input2 = { ids: ["4", "5", "6"] };
    const result2 = markReadSchema.safeParse(input2);
    if (result2.success && result2.data.ids?.every(id => typeof id === 'number')) {
        console.log("PASS: Strings array accepted and coerced to numbers");
        console.log("Coerced values:", result2.data.ids);
    } else {
        console.error("FAIL: Strings array failed", result2);
    }

    // Test 3: Mixed array
    const input3 = { ids: [7, "8"] };
    const result3 = markReadSchema.safeParse(input3);
    if (result3.success && result3.data.ids?.every(id => typeof id === 'number')) {
        console.log("PASS: Mixed array accepted and coerced");
    } else {
        console.error("FAIL: Mixed array failed", result3);
    }
}

test();
