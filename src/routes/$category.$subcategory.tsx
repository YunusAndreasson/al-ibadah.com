import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/$category/$subcategory')({
  component: SubcategoryLayout,
})

function SubcategoryLayout() {
  return <Outlet />
}
