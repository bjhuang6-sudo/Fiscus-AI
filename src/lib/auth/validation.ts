import * as z from "zod";

export const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const VerifyCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{5}$/, "Enter the 5-digit code."),
});

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
});
