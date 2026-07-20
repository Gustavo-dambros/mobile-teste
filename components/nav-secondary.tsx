"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

import { sidebarItem, hoverNudge, tapScale, microTap } from "@/lib/motion"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    isActive?: boolean
    icon: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const reduced = useReducedMotion()
  const itemVariants = sidebarItem(reduced)
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <motion.div
                variants={itemVariants}
                whileHover={reduced ? undefined : hoverNudge}
                whileTap={reduced ? undefined : tapScale}
                transition={microTap(reduced)}
              >
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.isActive}
                  render={<Link href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
