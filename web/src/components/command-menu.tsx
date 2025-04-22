"use client"

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useMediaQuery } from "@/hooks/use-media-query"
import { fuzzySearch } from "@/lib/utils"
import { Icon } from "@/types/icons"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface CommandMenuProps {
	icons: {
		name: string
		data: {
			categories: string[]
			aliases: string[]
			[key: string]: unknown
		}
	}[]
	triggerButtonId?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function CommandMenu({ icons, open: externalOpen, onOpenChange: externalOnOpenChange }: CommandMenuProps) {
	const router = useRouter()
	const [internalOpen, setInternalOpen] = useState(false)
	const [query, setQuery] = useState("")
	const isDesktop = useMediaQuery("(min-width: 768px)")

	// Use either external or internal state for controlling open state
	const isOpen = externalOpen !== undefined ? externalOpen : internalOpen

	// Wrap setIsOpen in useCallback to fix dependency issue
	const setIsOpen = useCallback(
		(value: boolean) => {
			if (externalOnOpenChange) {
				externalOnOpenChange(value)
			} else {
				setInternalOpen(value)
			}
		},
		[externalOnOpenChange],
	)

	const filteredIcons = getFilteredIcons(icons, query)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.key === "k" && (e.metaKey || e.ctrlKey)) ||
				(e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")
			) {
				e.preventDefault()
				setIsOpen(!isOpen)
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [isOpen, setIsOpen])

	function getFilteredIcons(iconList: CommandMenuProps["icons"], query: string) {
		if (!query) {
			// Return a limited number of icons when no query is provided
			return iconList.slice(0, 8)
		}

		// Calculate scores for each icon
		const scoredIcons = iconList.map((icon) => {
			// Calculate scores for different fields
			const nameScore = fuzzySearch(icon.name, query) * 2.0 // Give more weight to name matches

			// Get max score from aliases
			const aliasScore =
				icon.data.aliases && icon.data.aliases.length > 0
					? Math.max(...icon.data.aliases.map((alias) => fuzzySearch(alias, query))) * 1.8 // Increased weight for aliases
					: 0

			// Get max score from categories
			const categoryScore =
				icon.data.categories && icon.data.categories.length > 0
					? Math.max(...icon.data.categories.map((category) => fuzzySearch(category, query)))
					: 0

			// Use the highest score
			const score = Math.max(nameScore, aliasScore, categoryScore)

			return { icon, score, matchedField: score === nameScore ? "name" : score === aliasScore ? "alias" : "category" }
		})

		// Filter icons with a minimum score and sort by highest score
		return scoredIcons
			.filter((item) => item.score > 0.3) // Higher threshold for more accurate results
			.sort((a, b) => b.score - a.score)
			.slice(0, 20) // Limit the number of results
			.map((item) => item.icon)
	}

	const handleSelect = (name: string) => {
		setIsOpen(false)
		router.push(`/icons/${name}`)
	}

	return (
		<CommandDialog open={isOpen} onOpenChange={setIsOpen}>
			<CommandInput placeholder="Search icons by name, category, or alias..." value={query} onValueChange={setQuery} />
			<CommandList className="max-h-[350px]">
				<CommandEmpty>
					<div className="py-6 text-center">
						<p className="text-sm text-muted-foreground">No matching icons found.</p>
						<p className="text-xs text-muted-foreground mt-1">Try a different search term or browse all icons.</p>
					</div>
				</CommandEmpty>
				<CommandGroup heading="Icons">
					{filteredIcons.map(({ name, data }) => {
						// Find matched alias for display if available
						const matchedAlias =
							query && data.aliases && data.aliases.length > 0
								? data.aliases.find((alias) => alias.toLowerCase().includes(query.toLowerCase()))
								: null

						return (
							<CommandItem key={name} value={name} onSelect={() => handleSelect(name)} className="flex items-center gap-3 cursor-pointer">
								<div className="flex-shrink-0 h-8 w-8 relative">
									<div className="h-8 w-8 bg-accent/40 dark:bg-accent/25 rounded-lg border border-border/60 flex items-center justify-center shadow-sm backdrop-blur-sm">
										<span className="text-[10px] font-medium">{name.substring(0, 2).toUpperCase()}</span>
									</div>
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="capitalize text-sm font-medium">{name.replace(/-/g, " ")}</span>
									{matchedAlias && (
										<span className="text-xs text-muted-foreground truncate max-w-[180px]">
											Alias: {matchedAlias}
										</span>
									)}
									{!matchedAlias && data.categories && data.categories.length > 0 && (
										<span className="text-xs text-muted-foreground truncate max-w-[180px]">
											{data.categories[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
										</span>
									)}
								</div>
							</CommandItem>
						)
					})}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}
