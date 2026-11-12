'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function DeleteUserButton({ targetUserId }: { targetUserId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure you want to permanently delete this user?')) return;

    setIsDeleting(true)
    const toastId = toast.loading('Deleting user...')

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success('User permanently deleted', { id: toastId })
      router.refresh() // Refresh the page to remove the user from the list
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
    >
      {isDeleting ? 'Deleting...' : 'Delete User'}
    </button>
  )
}