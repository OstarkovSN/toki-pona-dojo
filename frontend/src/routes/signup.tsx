import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
  useSearch,
} from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthLayout } from "@/components/Common/AuthLayout"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

const formSchema = z
  .object({
    email: z.email(),
    full_name: z.string().min(1, { message: "Full Name is required" }),
    password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" }),
    confirm_password: z
      .string()
      .min(1, { message: "Password confirmation is required" }),
    invite_token: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "The passwords don't match",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute("/signup")({
  component: SignUp,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Sign Up - toki pona dojo",
      },
    ],
  }),
})

function SignUp() {
  const { signUpMutation } = useAuth()
  const { token } = useSearch({ from: "/signup" })
  const [tokenState, setTokenState] = useState<
    "loading" | "valid" | "invalid" | "no-token" | "network-error"
  >(token ? "loading" : "no-token")
  const [botUsername, setBotUsername] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
      invite_token: token ?? "",
    },
  })

  // Fetch public config for bot username
  useEffect(() => {
    fetch("/api/v1/config/public")
      .then((res) => res.json())
      .then((data: { bot_username?: string }) => {
        if (data.bot_username) {
          setBotUsername(data.bot_username)
        }
      })
      .catch((err) => {
        console.warn(
          "[signup] Could not fetch public config for bot username:",
          err,
        )
      })
  }, [])

  // Validate token on mount
  useEffect(() => {
    if (!token) return
    fetch(`/api/v1/users/validate-token?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) {
          console.error("[signup] Token validation returned HTTP", res.status)
          setTokenState("invalid")
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data)
          setTokenState(
            (data as { valid: boolean }).valid ? "valid" : "invalid",
          )
      })
      .catch((err) => {
        console.error("[signup] Token validation request failed:", err)
        setTokenState("network-error")
      })
  }, [token])

  const onSubmit = (data: FormData) => {
    if (signUpMutation.isPending) return
    const { confirm_password: _confirm_password, ...submitData } = data
    submitData.invite_token = token ?? ""
    signUpMutation.mutate(submitData)
  }

  // No token in URL: show invite-only message
  if (tokenState === "no-token") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold">This app is invite-only</h1>
          <p className="text-muted-foreground">
            Request access via our Telegram bot
            {botUsername ? (
              <>
                :{" "}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                  data-testid="telegram-bot-link"
                >
                  @{botUsername}
                </a>
              </>
            ) : (
              "."
            )}
          </p>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <RouterLink to="/login" className="underline underline-offset-4">
              Log in
            </RouterLink>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Token is loading
  if (tokenState === "loading") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Validating invite token...</p>
        </div>
      </AuthLayout>
    )
  }

  // Token is invalid
  if (tokenState === "invalid") {
    return (
      <AuthLayout>
        <div
          className="flex flex-col items-center gap-4 text-center"
          data-testid="invalid-token-message"
        >
          <h1 className="text-2xl font-bold">Invalid invite token</h1>
          <p className="text-muted-foreground">
            This invite token is invalid or has already been used.
          </p>
          {botUsername && (
            <p className="text-sm text-muted-foreground">
              Request a new one via{" "}
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                @{botUsername}
              </a>
            </p>
          )}
          <div className="text-center text-sm">
            Already have an account?{" "}
            <RouterLink to="/login" className="underline underline-offset-4">
              Log in
            </RouterLink>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Network error during token validation
  if (tokenState === "network-error") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold">Connection error</h1>
          <p className="text-muted-foreground">
            Could not verify your invite token — check your connection and try
            again.
          </p>
          <button
            type="button"
            className="underline underline-offset-4 text-sm"
            onClick={() => {
              setTokenState("loading")
              fetch(
                `/api/v1/users/validate-token?token=${encodeURIComponent(token ?? "")}`,
              )
                .then((res) => {
                  if (!res.ok) {
                    console.error(
                      "[signup] Token validation returned HTTP",
                      res.status,
                    )
                    setTokenState("invalid")
                    return null
                  }
                  return res.json()
                })
                .then((data) => {
                  if (data)
                    setTokenState(
                      (data as { valid: boolean }).valid ? "valid" : "invalid",
                    )
                })
                .catch((err) => {
                  console.error(
                    "[signup] Token validation request failed:",
                    err,
                  )
                  setTokenState("network-error")
                })
            }}
          >
            Retry
          </button>
        </div>
      </AuthLayout>
    )
  }

  // Token is valid: show the signup form
  return (
    <AuthLayout>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Create an account</h1>
          </div>

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="full-name-input"
                      placeholder="User"
                      type="text"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      placeholder="user@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      data-testid="password-input"
                      placeholder="Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      data-testid="confirm-password-input"
                      placeholder="Confirm Password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden invite token field */}
            <input type="hidden" {...form.register("invite_token")} />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={signUpMutation.isPending}
            >
              Sign Up
            </LoadingButton>
          </div>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <RouterLink to="/login" className="underline underline-offset-4">
              Log in
            </RouterLink>
          </div>
        </form>
      </Form>
    </AuthLayout>
  )
}

export default SignUp
