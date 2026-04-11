'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Users, RefreshCw, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useProjects, useDeleteProject } from '@/hooks/useProjects'
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/useUsers'
import { useProject } from '@/providers/ProjectProvider'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { useAlertModal, useToast } from '@/components/ui'
import { ImportModal } from './ImportModal'
import styles from './page.module.css'

export default function ProjectsPage() {
  const router = useRouter()
  const { userId, setUserId, setCurrentProject } = useProject()
  const { alertError, dangerConfirm } = useAlertModal()
  const toast = useToast()
  const [showUserModal, setShowUserModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: projects, isLoading: projectsLoading, refetch } = useProjects(userId || undefined)
  const deleteProjectMutation = useDeleteProject()
  const createUserMutation = useCreateUser()
  const deleteUserMutation = useDeleteUser()
  const hasAutoSelected = useRef(false)

  // Clear stale userId if deleted, or auto-select first user on initial load
  useEffect(() => {
    if (!users) return
    if (userId && !users.find(u => u.id === userId)) {
      setUserId(users.length > 0 ? users[0].id : null)
      setCurrentProject(null)
    } else if (!hasAutoSelected.current && !userId && users.length > 0) {
      setUserId(users[0].id)
      hasAutoSelected.current = true
    }
  }, [userId, users, setUserId, setCurrentProject])

  const handleSelectProject = (project: { id: string; name: string; targetDomain: string }) => {
    setCurrentProject({
      id: project.id,
      name: project.name,
      targetDomain: project.targetDomain,
      createdAt: '',
      updatedAt: ''
    })
    router.push(`/graph?project=${project.id}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (await dangerConfirm('确定要删除该项目吗？此操作不可撤销。')) {
      await deleteProjectMutation.mutateAsync(projectId)
      toast.success('项目已删除')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await createUserMutation.mutateAsync({
        name: newUserName,
        email: newUserEmail
      })
      setUserId(user.id)
      setShowUserModal(false)
      setNewUserName('')
      setNewUserEmail('')
      toast.success('用户已创建')
    } catch (error) {
      alertError(error instanceof Error ? error.message : '创建用户失败')
    }
  }

  const handleDeleteUser = async () => {
    if (!userId) return
    const selectedUser = users?.find(u => u.id === userId)
    const projectCount = selectedUser?._count?.projects ?? 0
    const warning = projectCount > 0
      ? `将永久删除用户“${selectedUser?.name}”及其 ${projectCount} 个项目。此操作不可撤销。`
      : `确定要删除用户“${selectedUser?.name}”吗？此操作不可撤销。`
    if (await dangerConfirm(warning)) {
      try {
        await deleteUserMutation.mutateAsync(userId)
        setUserId(null)
        setCurrentProject(null)
        toast.success('用户已删除')
      } catch (error) {
        alertError(error instanceof Error ? error.message : '删除用户失败')
      }
    }
  }

  const isLoading = usersLoading || projectsLoading

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FolderOpen size={20} />
          <h1 className={styles.title}>项目</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            className="iconButton"
            onClick={() => refetch()}
            title="刷新"
          >
            <RefreshCw size={14} />
          </button>
          {userId && (
            <button
              className="secondaryButton"
              onClick={() => setShowImportModal(true)}
              title="从备份导入项目"
            >
              <Upload size={14} />
              导入项目
            </button>
          )}
          {userId ? (
            <Link href="/projects/new" className="primaryButton">
              <Plus size={14} />
              新建项目
            </Link>
          ) : (
            <button className="primaryButton" disabled>
              <Plus size={14} />
              新建项目
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>加载中…</div>
      ) : projects && projects.length > 0 ? (
        <div className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              targetDomain={project.targetDomain}
              description={project.description}
              createdAt={project.createdAt}
              onSelect={() => handleSelectProject(project)}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <FolderOpen size={48} />
          <h2>暂无项目</h2>
          <p>创建你的第一个项目以开始侦察。</p>
          {userId ? (
            <Link href="/projects/new" className="primaryButton">
              <Plus size={14} />
              创建项目
            </Link>
          ) : (
            <button className="primaryButton" disabled>
              <Plus size={14} />
              创建项目
            </button>
          )}
        </div>
      )}

      {userId && (
        <ImportModal
          isOpen={showImportModal}
          userId={userId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => refetch()}
        />
      )}

    </div>
  )
}
