import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/config/site"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useIsAdmin } from "@/hooks/use-admin"
import { useSession } from "@/hooks/use-session"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { PopoverAnchor } from "@radix-ui/react-popover"
import { InputEmoji } from 'react-input-emoji';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  CommandMenu,
  CommandList as CommandListNew,
  CommandInput as CommandInputNew,
  CommandItem as CommandItemNew,
  CommandEmpty as CommandEmptyNew,
  CommandGroup as CommandGroupNew,
  CommandSeparator as CommandSeparatorNew,
  CommandShortcut as CommandShortcutNew,
} from "@/components/ui/command-menu"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ResizableSeparator,
} from "@/components/ui/resizable"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Skeleton as SkeletonNew,
} from "@/components/ui/skeleton"
import {
  ResizableHandle as ResizableHandleNew,
  ResizablePanel as ResizablePanelNew,
  ResizablePanelGroup as ResizablePanelGroupNew,
  ResizableSeparator as ResizableSeparatorNew,
} from "@/components/ui/resizable"
import {
  Sheet as SheetNew,
  SheetClose as SheetCloseNew,
  SheetContent as SheetContentNew,
  SheetDescription as SheetDescriptionNew,
  SheetFooter as SheetFooterNew,
  SheetHeader as SheetHeaderNew,
  SheetTitle as SheetTitleNew,
  SheetTrigger as SheetTriggerNew,
} from "@/components/ui/sheet"
import {
  useToast as useToastNew,
} from "@/hooks/use-toast"
import {
  AlertDialog as AlertDialogNew,
  AlertDialogAction as AlertDialogActionNew,
  AlertDialogCancel as AlertDialogCancelNew,
  AlertDialogContent as AlertDialogContentNew,
  AlertDialogDescription as AlertDialogDescriptionNew,
  AlertDialogFooter as AlertDialogFooterNew,
  AlertDialogHeader as AlertDialogHeaderNew,
  AlertDialogTrigger as AlertDialogTriggerNew,
} from "@/components/ui/alert-dialog"
import {
  Tooltip as TooltipNew,
  TooltipContent as TooltipContentNew,
  TooltipProvider as TooltipProviderNew,
  TooltipTrigger as TooltipTriggerNew,
} from "@/components/ui/tooltip"
import {
  HoverCard as HoverCardNew,
  HoverCardContent as HoverCardContentNew,
  HoverCardTrigger as HoverCardTriggerNew,
} from "@/components/ui/hover-card"
import {
  DropdownMenu as DropdownMenuNew,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemNew,
  DropdownMenuContent as DropdownMenuContentNew,
  DropdownMenuItem as DropdownMenuItemNew,
  DropdownMenuLabel as DropdownMenuLabelNew,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupNew,
  DropdownMenuRadioItem as DropdownMenuRadioItemNew,
  DropdownMenuSeparator as DropdownMenuSeparatorNew,
  DropdownMenuShortcut as DropdownMenuShortcutNew,
  DropdownMenuSub as DropdownMenuSubNew,
  DropdownMenuSubContent as DropdownMenuSubContentNew,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerNew,
  DropdownMenuTrigger as DropdownMenuTriggerNew,
} from "@/components/ui/dropdown-menu"
import {
  Command as CommandNew,
  CommandDialog as CommandDialogNew,
  CommandEmpty as CommandEmptyNew,
  CommandGroup as CommandGroupNew,
  CommandInput as CommandInputNew,
  CommandItem as CommandItemNew,
  CommandList as CommandListNewNew,
  CommandSeparator as CommandSeparatorNewNew,
  CommandShortcut as CommandShortcutNewNew,
} from "@/components/ui/command"
import {
  Popover as PopoverNew,
  PopoverClose as PopoverCloseNew,
  PopoverContent as PopoverContentNew,
  PopoverTrigger as PopoverTriggerNew,
} from "@/components/ui/popover"
import {
  Dialog as DialogNew,
  DialogContent as DialogContentNew,
  DialogDescription as DialogDescriptionNew,
  DialogHeader as DialogHeaderNew,
  DialogTitle as DialogTitleNew,
  DialogTrigger as DialogTriggerNew,
} from "@/components/ui/dialog"
import {
  Drawer as DrawerNew,
  DrawerClose as DrawerCloseNew,
  DrawerContent as DrawerContentNew,
  DrawerDescription as DrawerDescriptionNew,
  DrawerFooter as DrawerFooterNew,
  DrawerHeader as DrawerHeaderNew,
  DrawerTitle as DrawerTitleNew,
  DrawerTrigger as DrawerTriggerNew,
} from "@/components/ui/drawer"
import {
  Carousel as CarouselNew,
  CarouselContent as CarouselContentNew,
  CarouselItem as CarouselItemNew,
  CarouselNext as CarouselNextNew,
  CarouselPrevious as CarouselPreviousNew,
} from "@/components/ui/carousel"
import {
  Collapsible as CollapsibleNew,
  CollapsibleContent as CollapsibleContentNew,
  CollapsibleTrigger as CollapsibleTriggerNew,
} from "@/components/ui/collapsible"
import {
  ContextMenu as ContextMenuNew,
  ContextMenuCheckboxItem as ContextMenuCheckboxItemNew,
  ContextMenuContent as ContextMenuContentNew,
  ContextMenuItem as ContextMenuItemNew,
  ContextMenuLabel as ContextMenuLabelNew,
  ContextMenuRadioGroup as ContextMenuRadioGroupNew,
  ContextMenuRadioItem as ContextMenuRadioItemNew,
  ContextMenuSeparator as ContextMenuSeparatorNew,
  ContextMenuSub as ContextMenuSubNew,
  ContextMenuSubContent as ContextMenuSubContentNew,
  ContextMenuSubTrigger as ContextMenuSubTriggerNew,
  ContextMenuTrigger as ContextMenuTriggerNew,
} from "@/components/ui/context-menu"
import {
  Accordion as AccordionNew,
  AccordionContent as AccordionContentNew,
  AccordionItem as AccordionItemNew,
  AccordionTrigger as AccordionTriggerNew,
} from "@/components/ui/accordion"
import {
  Table as TableNew,
  TableBody as TableBodyNew,
  TableCaption as TableCaptionNew,
  TableCell as TableCellNew,
  TableFooter as TableFooterNew,
  TableHead as TableHeadNew,
  TableHeader as TableHeaderNew,
  TableRow as TableRowNew,
} from "@/components/ui/table"
import {
  Tabs as TabsNew,
  TabsContent as TabsContentNew,
  TabsList as TabsListNew,
  TabsTrigger as TabsTriggerNew,
} from "@/components/ui/tabs"
import {
  CardHeader as CardHeaderNew,
  CardTitle as CardTitleNew,
  CardDescription as CardDescriptionNew,
} from "@/components/ui/card"
import {
  ScrollArea as ScrollAreaNew,
} from "@/components/ui/scroll-area"
import {
  Separator as SeparatorNew,
} from "@/components/ui/separator"
import {
  Badge as BadgeNew,
} from "@/components/ui/badge"
import {
  Progress as ProgressNew,
} from "@/components/ui/progress"
import {
  AlertDialog as AlertDialogNewNew,
  AlertDialogAction as AlertDialogActionNewNew,
  AlertDialogCancel as AlertDialogCancelNewNew,
  AlertDialogContent as AlertDialogContentNewNew,
  AlertDialogDescription as AlertDialogDescriptionNewNew,
  AlertDialogFooter as AlertDialogFooterNewNew,
  AlertDialogHeader as AlertDialogHeaderNewNew,
  AlertDialogTrigger as AlertDialogTriggerNewNew,
} from "@/components/ui/alert-dialog"
import {
  Tooltip as TooltipNewNew,
  TooltipContent as TooltipContentNewNew,
  TooltipProvider as TooltipProviderNewNew,
  TooltipTrigger as TooltipTriggerNewNew,
} from "@/components/ui/tooltip"
import {
  HoverCard as HoverCardNewNew,
  HoverCardContent as HoverCardContentNewNew,
  HoverCardTrigger as HoverCardTriggerNewNew,
} from "@/components/ui/hover-card"
import {
  DropdownMenu as DropdownMenuNewNew,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemNewNew,
  DropdownMenuContent as DropdownMenuContentNewNew,
  DropdownMenuItem as DropdownMenuItemNewNew,
  DropdownMenuLabel as DropdownMenuLabelNewNew,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupNewNew,
  DropdownMenuRadioItem as DropdownMenuRadioItemNewNew,
  DropdownMenuSeparator as DropdownMenuSeparatorNewNew,
  DropdownMenuShortcut as DropdownMenuShortcutNewNew,
  DropdownMenuSub as DropdownMenuSubNewNew,
  DropdownMenuSubContent as DropdownMenuSubContentNewNew,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerNewNew,
  DropdownMenuTrigger as DropdownMenuTriggerNewNew,
} from "@/components/ui/dropdown-menu"
import {
  Command as CommandNewNew,
  CommandDialog as CommandDialogNewNew,
  CommandEmpty as CommandEmptyNewNew,
  CommandGroup as CommandGroupNewNew,
  CommandInput as CommandInputNewNew,
  CommandItem as CommandItemNewNew,
  CommandList as CommandListNewNewNew,
  CommandSeparator as CommandSeparatorNewNewNew,
  CommandShortcut as CommandShortcutNewNewNew,
} from "@/components/ui/command"
import {
  Popover as PopoverNewNew,
  PopoverClose as PopoverCloseNewNew,
  PopoverContent as PopoverContentNewNew,
  PopoverTrigger as PopoverTriggerNewNew,
} from "@/components/ui/popover"
import {
  Dialog as DialogNewNew,
  DialogContent as DialogContentNewNew,
  DialogDescription as DialogDescriptionNewNew,
  DialogHeader as DialogHeaderNewNew,
  DialogTitle as DialogTitleNewNew,
  DialogTrigger as DialogTriggerNewNew,
} from "@/components/ui/dialog"
import {
  Drawer as DrawerNewNew,
  DrawerClose as DrawerCloseNewNew,
  DrawerContent as DrawerContentNewNew,
  DrawerDescription as DrawerDescriptionNewNew,
  DrawerFooter as DrawerFooterNewNew,
  DrawerHeader as DrawerHeaderNewNew,
  DrawerTitle as DrawerTitleNewNew,
  DrawerTrigger as DrawerTriggerNewNew,
} from "@/components/ui/drawer"
import {
  Carousel as CarouselNewNew,
  CarouselContent as CarouselContentNewNew,
  CarouselItem as CarouselItemNewNew,
  CarouselNext as CarouselNextNewNew,
  CarouselPrevious as CarouselPreviousNewNew,
} from "@/components/ui/carousel"
import {
  Collapsible as CollapsibleNewNew,
  CollapsibleContent as CollapsibleContentNewNew,
  CollapsibleTrigger as CollapsibleTriggerNewNew,
} from "@/components/ui/collapsible"
import {
  ContextMenu as ContextMenuNewNew,
  ContextMenuCheckboxItem as ContextMenuCheckboxItemNewNew,
  ContextMenuContent as ContextMenuContentNewNew,
  ContextMenuItem as ContextMenuItemNewNew,
  ContextMenuLabel as ContextMenuLabelNewNew,
  ContextMenuRadioGroup as ContextMenuRadioGroupNewNew,
  ContextMenuRadioItem as ContextMenuRadioItemNewNew,
  ContextMenuSeparator as ContextMenuSeparatorNewNew,
  ContextMenuSub as ContextMenuSubNewNew,
  ContextMenuSubContent as ContextMenuSubContentNewNew,
  ContextMenuSubTrigger as ContextMenuSubTriggerNewNew,
  ContextMenuTrigger as ContextMenuTriggerNewNew,
} from "@/components/ui/context-menu"
import {
  Accordion as AccordionNewNew,
  AccordionContent as AccordionContentNewNew,
  AccordionItem as AccordionItemNewNew,
  AccordionTrigger as AccordionTriggerNewNew,
} from "@/components/ui/accordion"
import {
  Table as TableNewNew,
  TableBody as TableBodyNewNew,
  TableCaption as TableCaptionNewNew,
  TableCell as TableCellNewNew,
  TableFooter as TableFooterNewNew,
  TableHead as TableHeadNewNew,
  TableHeader as TableHeaderNewNew,
  TableRow as TableRowNewNew,
} from "@/components/ui/table"
import {
  Tabs as TabsNewNew,
  TabsContent as TabsContentNewNew,
  TabsList as TabsListNewNew,
  TabsTrigger as TabsTriggerNewNew,
} from "@/components/ui/tabs"
import {
  CardHeader as CardHeaderNewNew,
  CardTitle as CardTitleNewNew,
  CardDescription as CardDescriptionNewNew,
} from "@/components/ui/card"
import {
  ScrollArea as ScrollAreaNewNew,
} from "@/components/ui/scroll-area"
import {
  Separator as SeparatorNewNew,
} from "@/components/ui/separator"
import {
  Badge as BadgeNewNew,
} from "@/components/ui/badge"
import {
  Progress as ProgressNewNew,
} from "@/components/ui/progress"
import {
  AlertDialog as AlertDialogNewNewNew,
  AlertDialogAction as AlertDialogActionNewNewNew,
  AlertDialogCancel as AlertDialogCancelNewNewNew,
  AlertDialogContent as AlertDialogContentNewNewNew,
  AlertDialogDescription as AlertDialogDescriptionNewNewNew,
  AlertDialogFooter as AlertDialogFooterNewNewNew,
  AlertDialogHeader as AlertDialogHeaderNewNewNew,
  AlertDialogTrigger as AlertDialogTriggerNewNewNew,
} from "@/components/ui/alert-dialog"
import {
  Tooltip as TooltipNewNewNew,
  TooltipContent as TooltipContentNewNewNew,
  TooltipProvider as TooltipProviderNewNewNew,
  TooltipTrigger as TooltipTriggerNewNewNew,
} from "@/components/ui/tooltip"
import {
  HoverCard as HoverCardNewNewNew,
  HoverCardContent as HoverCardContentNewNewNew,
  HoverCardTrigger as HoverCardTriggerNewNewNew,
} from "@/components/ui/hover-card"
import {
  DropdownMenu as DropdownMenuNewNewNew,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemNewNewNew,
  DropdownMenuContent as DropdownMenuContentNewNewNew,
  DropdownMenuItem as DropdownMenuItemNewNewNew,
  DropdownMenuLabel as DropdownMenuLabelNewNewNew,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupNewNewNew,
  DropdownMenuRadioItem as DropdownMenuRadioItemNewNewNew,
  DropdownMenuSeparator as DropdownMenuSeparatorNewNewNew,
  DropdownMenuShortcut as DropdownMenuShortcutNewNewNew,
  DropdownMenuSub as DropdownMenuSubNewNewNew,
  DropdownMenuSubContent as DropdownMenuSubContentNewNewNew,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerNewNewNew,
  DropdownMenuTrigger as DropdownMenuTriggerNewNewNew,
} from "@/components/ui/dropdown-menu"
import {
  Command as CommandNewNewNew,
  CommandDialog as CommandDialogNewNewNew,
  CommandEmpty as CommandEmptyNewNewNew,
  CommandGroup as CommandGroupNewNewNew,
  CommandInput as CommandInputNewNewNew,
  CommandItem as CommandItemNewNewNew,
  CommandList as CommandListNewNewNewNew,
  CommandSeparator as CommandSeparatorNewNewNewNew,
  CommandShortcut as CommandShortcutNewNewNewNew,
} from "@/components/ui/command"
import {
  Popover as PopoverNewNewNew,
  PopoverClose as PopoverCloseNewNewNew,
  PopoverContent as PopoverContentNewNewNew,
  PopoverTrigger as PopoverTriggerNewNewNew,
} from "@/components/ui/popover"
import {
  Dialog as DialogNewNewNew,
  DialogContent as DialogContentNewNewNew,
  DialogDescription as DialogDescriptionNewNewNew,
  DialogHeader as DialogHeaderNewNewNew,
  DialogTitle as DialogTitleNewNewNew,
  DialogTrigger as DialogTriggerNewNewNew,
} from "@/components/ui/dialog"
import {
  Drawer as DrawerNewNewNew,
  DrawerClose as DrawerCloseNewNewNew,
  DrawerContent as DrawerContentNewNewNew,
  DrawerDescription as DrawerDescriptionNewNewNew,
  DrawerFooter as DrawerFooterNewNewNew,
  DrawerHeader as DrawerHeaderNewNewNew,
  DrawerTitle as DrawerTitleNewNewNew,
  DrawerTrigger as DrawerTriggerNewNewNew,
} from "@/components/ui/drawer"
import {
  Carousel as CarouselNewNewNew,
  CarouselContent as CarouselContentNewNewNew,
  CarouselItem as CarouselItemNewNewNew,
  CarouselNext as CarouselNextNewNewNew,
  CarouselPrevious as CarouselPreviousNewNewNew,
} from "@/components/ui/carousel"
import {
  Collapsible as CollapsibleNewNewNew,
  CollapsibleContent as CollapsibleContentNewNewNew,
  CollapsibleTrigger as CollapsibleTriggerNewNewNew,
} from "@/components/ui/collapsible"
import {
  ContextMenu as ContextMenuNewNewNew,
  ContextMenuCheckboxItem as ContextMenuCheckboxItemNewNewNew,
  ContextMenuContent as ContextMenuContentNewNewNew,
  ContextMenuItem as ContextMenuItemNewNewNew,
  ContextMenuLabel as ContextMenuLabelNewNewNew,
  ContextMenuRadioGroup as ContextMenuRadioGroupNewNewNew,
  ContextMenuRadioItem as ContextMenuRadioItemNewNewNew,
  ContextMenuSeparator as ContextMenuSeparatorNewNewNew,
  ContextMenuSub as ContextMenuSubNewNewNew,
  ContextMenuSubContent as ContextMenuSubContentNewNewNew,
  ContextMenuSubTrigger as ContextMenuSubTriggerNewNewNew,
  ContextMenuTrigger as ContextMenuTriggerNewNewNew,
} from "@/components/ui/context-menu"
import {
  Accordion as AccordionNewNewNew,
  AccordionContent as AccordionContentNewNewNew,
  AccordionItem as AccordionItemNewNewNew,
  AccordionTrigger as AccordionTriggerNewNewNew,
} from "@/components/ui/accordion"
import {
  Table as TableNewNewNew,
  TableBody as TableBodyNewNewNew,
  TableCaption as TableCaptionNewNewNew,
  TableCell as TableCellNewNewNew,
  TableFooter as TableFooterNewNewNew,
  TableHead as TableHeadNewNewNew,
  TableHeader as TableHeaderNewNewNew,
  TableRow as TableRowNewNewNew,
} from "@/components/ui/table"
import {
  Tabs as TabsNewNewNew,
  TabsContent as TabsContentNewNewNew,
  TabsList as TabsListNewNewNew,
  TabsTrigger as TabsTriggerNewNewNew,
} from "@/components/ui/tabs"
import {
  CardHeader as CardHeaderNewNewNew,
  CardTitle as CardTitleNewNewNew,
  CardDescription as CardDescriptionNewNewNew,
} from "@/components/ui/card"
import {
  ScrollArea as ScrollAreaNewNewNew,
} from "@/components/ui/scroll-area"
import {
  Separator as SeparatorNewNewNew,
} from "@/components/ui/separator"
import {
  Badge as BadgeNewNewNew,
} from "@/components/ui/badge"
import {
  Progress as ProgressNewNewNew,
} from "@/components/ui/progress"
import {
  AlertDialog as AlertDialogNewNewNewNew,
  AlertDialogAction as AlertDialogActionNewNewNewNew,
  AlertDialogCancel as AlertDialogCancelNewNewNewNew,
  AlertDialogContent as AlertDialogContentNewNewNewNew,
  AlertDialogDescription as AlertDialogDescriptionNewNewNewNew,
  AlertDialogFooter as AlertDialogFooterNewNewNewNew,
  AlertDialogHeader as AlertDialogHeaderNewNewNewNew,
  AlertDialogTrigger as AlertDialogTriggerNewNewNewNew,
} from "@/components/ui/alert-dialog"
import {
  Tooltip as TooltipNewNewNewNew,
  TooltipContent as TooltipContentNewNewNewNew,
  TooltipProvider as TooltipProviderNewNewNewNew,
  TooltipTrigger as TooltipTriggerNewNewNewNew,
} from "@/components/ui/tooltip"
import {
  HoverCard as HoverCardNewNewNewNew,
  HoverCardContent as HoverCardContentNewNewNewNew,
  HoverCardTrigger as HoverCardTriggerNewNewNewNew,
} from "@/components/ui/hover-card"
import {
  DropdownMenu as DropdownMenuNewNewNewNew,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemNewNewNewNew,
  DropdownMenuContent as DropdownMenuContentNewNewNewNew,
  DropdownMenuItem as DropdownMenuItemNewNewNewNew,
  DropdownMenuLabel as DropdownMenuLabelNewNewNewNew,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupNewNewNewNew,
  DropdownMenuRadioItem as DropdownMenuRadioItemNewNewNewNew,
  DropdownMenuSeparator as DropdownMenuSeparatorNewNewNewNew,
  DropdownMenuShortcut as DropdownMenuShortcutNewNewNewNew,
  DropdownMenuSub as DropdownMenuSubNewNewNewNew,
  DropdownMenuSubContent as DropdownMenuSubContentNewNewNewNew,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerNewNewNewNew,
  DropdownMenuTrigger as DropdownMenuTriggerNewNewNewNew,
} from "@/components/ui/dropdown-menu"
import {
  Command as CommandNewNewNewNew,
  CommandDialog as CommandDialogNewNewNewNew,
  CommandEmpty as CommandEmptyNewNewNewNew,
  CommandGroup as CommandGroupNewNewNewNew,
  CommandInput as CommandInputNewNewNewNew,
  CommandItem as CommandItemNewNewNewNew,
  CommandList as CommandListNewNewNewNewNew,
  CommandSeparator as CommandSeparatorNewNewNewNewNew,
  CommandShortcut as CommandShortcutNewNewNewNewNew,
} from "@/components/ui/command"
import {
  Popover as PopoverNewNewNewNew,
  PopoverClose as PopoverCloseNewNewNewNew,
  PopoverContent as PopoverContentNewNewNewNew,
  PopoverTrigger as PopoverTriggerNewNewNewNew,
} from "@/components/ui/popover"
import {
  Dialog as DialogNewNewNewNew,
  DialogContent as DialogContentNewNewNewNew,
  DialogDescription as DialogDescriptionNewNewNewNew,
  DialogHeader as DialogHeaderNewNewNewNew,
  DialogTitle as DialogTitleNewNewNewNew,
  DialogTrigger as DialogTriggerNewNewNewNew,
} from "@/components/ui/dialog"
import {
  Drawer as DrawerNewNewNewNew,
  DrawerClose as DrawerCloseNewNewNewNew,
  DrawerContent as DrawerContentNewNewNewNew,
  DrawerDescription as DrawerDescriptionNewNewNewNew,
  DrawerFooter as DrawerFooterNewNewNewNew,
  DrawerHeader as DrawerHeaderNewNewNewNew,
  DrawerTitle as DrawerTitleNewNewNewNew,
  DrawerTrigger as DrawerTriggerNewNewNewNew,
} from "@/components/ui/drawer"
import {
  Carousel as CarouselNewNewNewNew,
  CarouselContent as CarouselContentNewNewNewNew,
  CarouselItem as CarouselItemNewNewNewNew,
  CarouselNext as CarouselNextNewNewNewNew,
  CarouselPrevious as CarouselPreviousNewNewNewNew,
} from "@/components/ui/carousel"
import {
  Collapsible as CollapsibleNewNewNewNew,
  CollapsibleContent as CollapsibleContentNewNewNewNew,
  CollapsibleTrigger as CollapsibleTriggerNewNewNewNew,
} from "@/components/ui/collapsible"
import {
  ContextMenu as ContextMenuNewNewNewNew,
  ContextMenuCheckboxItem as ContextMenuCheckboxItemNewNewNewNew,
  ContextMenuContent as ContextMenuContentNewNewNewNew,
  ContextMenuItem as ContextMenuItemNewNewNewNew,
  ContextMenuLabel as ContextMenuLabelNewNewNewNew,
  ContextMenuRadioGroup as ContextMenuRadioGroupNewNewNewNew,
  ContextMenuRadioItem as ContextMenuRadioItemNewNewNewNew,
  ContextMenuSeparator as ContextMenuSeparatorNewNewNewNew,
  ContextMenuSub as ContextMenuSubNewNewNewNew,
  ContextMenuSubContent as ContextMenuSubContentNewNewNewNew,
  ContextMenuSubTrigger as ContextMenuSubTriggerNewNewNewNew,
  ContextMenuTrigger as ContextMenuTriggerNewNewNewNew,
} from "@/components/ui/context-menu"
import {
  Accordion as AccordionNewNewNewNew,
  AccordionContent as AccordionContentNewNewNewNew,
  AccordionItem as AccordionItemNewNewNewNew,
  AccordionTrigger as AccordionTriggerNewNewNewNew,
} from "@/components/ui/accordion"
import {
  Table as TableNewNewNewNew,
  TableBody as TableBodyNewNewNewNew,
  TableCaption as TableCaptionNewNewNewNew,
  TableCell as TableCellNewNewNewNew,
  TableFooter as TableFooterNewNewNewNew,
  TableHead as TableHeadNewNewNewNew,
  TableHeader as TableHeaderNewNewNewNew,
  TableRow as TableRowNewNewNewNew,
} from "@/components/ui/table"
import {
  Tabs as TabsNewNewNewNew,
  TabsContent as TabsContentNewNewNewNew,
  TabsList as TabsListNewNewNewNew,
  TabsTrigger as TabsTriggerNewNewNewNew,
} from "@/components/ui/tabs"
import {
  CardHeader as CardHeaderNewNewNewNew,
  CardTitle as CardTitleNewNewNewNew,
  CardDescription as CardDescriptionNewNewNewNew,
} from "@/components/ui/card"
import {
  ScrollArea as ScrollAreaNewNewNewNew,
} from "@/components/ui/scroll-area"
import {
  Separator as SeparatorNewNewNewNew,
} from "@/components/ui/separator"
import {
  Badge as BadgeNewNewNewNew,
} from "@/components/ui/badge"
import {
  Progress as ProgressNewNewNewNew,
} from "@/components/ui/progress"
import {
  AlertDialog as AlertDialogNewNewNewNewNew,
  AlertDialogAction as AlertDialogActionNewNewNewNewNew,
  AlertDialogCancel as AlertDialogCancelNewNewNewNewNew,
  AlertDialogContent as AlertDialogContentNewNewNewNewNew,
  AlertDialogDescription as AlertDialogDescriptionNewNewNewNewNew,
  AlertDialogFooter as AlertDialogFooterNewNewNewNewNew,
  AlertDialogHeader as AlertDialogHeaderNewNewNewNewNew,
  AlertDialogTrigger as AlertDialogTriggerNewNewNewNewNew,
} from "@/components/ui/alert-dialog"
import {
  Tooltip as TooltipNewNewNewNewNew,
  TooltipContent as TooltipContentNewNewNewNewNew,
  TooltipProvider as TooltipProviderNewNewNewNewNew,
  TooltipTrigger as TooltipTriggerNewNewNewNewNew,
} from "@/components/ui/tooltip"
import {
  HoverCard as HoverCardNewNewNewNewNew,
  HoverCardContent as HoverCardContentNewNewNewNewNew,
  HoverCardTrigger as HoverCardTriggerNewNewNewNewNew,
} from "@/components/ui/hover-card"
import {
  DropdownMenu as DropdownMenuNewNewNewNewNew,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemNewNewNewNewNew,
  DropdownMenuContent as DropdownMenuContentNewNewNewNewNew,
  DropdownMenuItem as DropdownMenuItemNewNewNewNewNew,
  DropdownMenuLabel as DropdownMenuLabelNewNewNewNewNew,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupNewNewNewNewNew,
  DropdownMenuRadioItem as DropdownMenuRadioItemNewNewNewNewNew,
  DropdownMenuSeparator as DropdownMenuSeparatorNewNewNewNewNew,
  DropdownMenuShortcut as DropdownMenuShortcutNewNewNewNewNew,
  DropdownMenuSub as DropdownMenuSubNewNewNewNewNew,
  DropdownMenuSubContent as DropdownMenuSubContentNewNewNewNewNew,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerNewNewNewNewNew,
  DropdownMenuTrigger as DropdownMenuTriggerNewNewNewNewNew,
} from "@/components/ui/dropdown-menu"
import {
  Command as CommandNewNewNewNewNew,
  CommandDialog as CommandDialogNewNewNewNewNew,
  CommandEmpty as CommandEmptyNewNewNewNewNew,
  CommandGroup as CommandGroupNewNewNewNewNew,
  CommandInput as CommandInputNewNewNewNewNew,
  CommandItem as CommandItemNewNewNewNewNew,
  CommandList as CommandListNewNewNewNewNewNew,
  CommandSeparator as CommandSeparatorNewNewNewNewNewNew,
  CommandShortcut as CommandShortcutNewNewNewNewNewNew,
} from "@/components/ui/command"
import {
  Popover as PopoverNewNewNewNewNew,
  PopoverClose as PopoverCloseNewNewNewNewNew,
  PopoverContent as PopoverContentNewNewNewNewNew,
  PopoverTrigger as PopoverTriggerNewNewNewNewNew,
} from "@/components/ui/popover"
import {
  Dialog as DialogNewNewNewNewNew,
  DialogContent as DialogContentNewNewNewNewNew,
  DialogDescription as DialogDescriptionNewNewNewNewNew,
  DialogHeader as DialogHeaderNewNewNewNewNew,
  DialogTitle as DialogTitleNewNewNewNewNew,
  DialogTrigger as DialogTriggerNewNewNewNewNew,
} from "@/components/ui/dialog"
import {
  Drawer as DrawerNewNewNewNewNew,
  DrawerClose as DrawerCloseNewNewNewNewNew,
  DrawerContent as DrawerContentNewNewNewNewNew,
  DrawerDescription as DrawerDescriptionNewNewNewNewNew,
  DrawerFooter as DrawerFooterNewNewNewNewNew,
  DrawerHeader as DrawerHeaderNewNewNewNewNew,
  DrawerTitle as DrawerTitleNewNewNewNewNew,
  DrawerTrigger as DrawerTriggerNewNewNewNewNew,
} from "@/components/ui/drawer"
import {
  Carousel as CarouselNewNewNewNewNew,
  CarouselContent as CarouselContentNewNewNewNewNew,
  CarouselItem as CarouselItemNewNewNewNewNew,
  CarouselNext as CarouselNextNewNewNewNewNew,
  CarouselPrevious as CarouselPreviousNewNewNewNewNew,
} from "@/components/ui/carousel"
import {
  Collapsible as CollapsibleNewNewNewNewNew,
  CollapsibleContent as CollapsibleContentNewNewNewNewNew,
  CollapsibleTrigger as CollapsibleTriggerNewNewNewNewNew,
} from "@/components/ui/collapsible"
import {
  ContextMenu as ContextMenuNewNewNewNewNew,
  ContextMenuCheckboxItem as ContextMenuCheckboxItemNewNewNewNewNew,
  ContextMenuContent as ContextMenuContentNewNewNewNewNew,
  ContextMenuItem as ContextMenuItemNewNewNewNewNew,
  ContextMenuLabel as ContextMenuLabelNewNewNewNewNew,
  ContextMenuRadioGroup as ContextMenuRadioGroupNewNewNewNewNew,
  ContextMenuRadioItem as ContextMenuRadioItemNewNewNewNewNew,
  ContextMenuSeparator as ContextMenuSeparatorNewNewNewNewNew,
  ContextMenuSub as ContextMenuSubNewNewNewNewNew,
  ContextMenuSubContent as ContextMenuSubContentNewNewNewNewNew,
  ContextMenuSubTrigger as ContextMenuSubTriggerNewNewNewNewNew,
  ContextMenuTrigger as ContextMenuTriggerNewNewNewNewNew,
} from "@/components/ui/context-menu"
import {
  Accordion as AccordionNewNewNewNewNew,
  AccordionContent as AccordionContentNewNewNewNewNew,
  AccordionItem as AccordionItem
