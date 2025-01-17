import {
  Calendar,
  Github,
  Mail,
  MessageSquare,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react"

export type Icon = LucideIcon

export const Icons = {
  github: Github,
  calendar: Calendar,
  mail: Mail,
  message: MessageSquare,
  settings: Settings,
  user: User,
} as const 