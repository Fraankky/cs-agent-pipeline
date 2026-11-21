import { Pipeline } from "@anvia/core/pipeline"
import z from "zod"
import { askAi, askAiJson } from "./shared"

const IntentSchema = z.object({
  intent: z.enum(["order_status", "refund", "technical_issue", "general"])
})

const DetailSchema = z.object({
  order_id: z.string().describe("Order ID from the customer message"),
  product: z.string().describe("Product name mentioned"),
  issue_summary: z.string().describe("One-sentence summary of the issue"),
})

const EvaluationSchema = z.object({
  passed: z.boolean(),
  feedback: z.string().min(1),
})

const csPipeline = new Pipeline({
  id: "cs-agent",
  inputSchema: z.object({ messageCustomer: z.string().min(1) })
}).step({
  id: "classify",
  run: async ({ input }) => {
    const intention = await askAiJson(`User prompt: ${input.messageCustomer}`, IntentSchema)

    const { intent } = IntentSchema.parse(intention.output)
    return {
      intent,
      messageCustomer: input.messageCustomer
    }
  }
}).step({
  id: "extract",
  run: async ({ input }) => {
    const extraction = await askAiJson(input.messageCustomer,
      DetailSchema, "Extract order details. Return NONE if missing"
    )
    return {
      ...input, ...DetailSchema.parse(extraction.output)
    }
  }
}).step({
  id: "draft",
  run: async ({ input }) => {
    if (input.intent === "general") {
      return { ...input, reply: "Terima kasih sudah menghubungi toko kita" }
    }
    let prompt: string
    switch (input.intent) {
      case "refund":
        prompt = `Write a concise, empathetic reply. The customer wants a refund. Product: ${input.product}, Order: ${input.order_id}`
      break
      case "order_status":
        prompt = `Write a concise, empathetic reply about the order status. Order: ${input.order_id}`
      break;
      case "technical_issue":
        prompt = `Write a concise, empathetic reply with troubleshooting steps. Product: ${input.product}, Issue: ${input.issue_summary}`
      break;
      default:
        prompt = `Write a concise, empathetic reply to: ${input.messageCustomer}`

    }
    const res = await askAi(`Write a concise, empathetic reply to: ${input.intent}`)
    return {
      ...input, reply: res.text
    }
  }
}).step({
  id: "evaluate",
  run: async ({ input }) => {
    if (input.intent === "general") {
      return { ...input, passed: true, feedback: "canned reply, no review needed" }
    }
    const result = await askAiJson(
      input.reply,
      EvaluationSchema,
      "Is the reply empathetic, concise, and has a concreate next step?",
    )
    return {
      ...input, ...EvaluationSchema.parse(result.output)
    }
  }
}).step({
  id: "revise",
  run: async ({ input }) => {
    if (input.passed) return input.reply

    const revised = await askAi(
      `Revise using this feedback: ${input.feedback}\n\nReply: ${input.reply}`
    )
    return revised.text
  }
})

const result = await csPipeline.run({
  input: { messageCustomer: "Order #A-123 Laptop saya rusak, mau refund" },
})

console.log(result.output)
