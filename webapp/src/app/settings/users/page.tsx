'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useUsers, useCreateUser, useDeleteUser, useChangePassword } from '@/hooks/useUsers'
import { Modal } from '@/components/ui'
import styles from './page.module.css'

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'password'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string }
  | { type: 'changeOwn' }

export default function UsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser, isAdmin, isLoading: authLoading } = useAuth()
  const { data: users, isLoading } = useUsers()
  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()
  const changePasswordMutation = useChangePassword()

  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('standard')
  const [currentPassword, setCurrentPassword] = useState('')

  const wantsPasswordChange = searchParams.get('changePassword') === 'true'

  // Handle ?changePassword=true from UserSelector for standard users
  useEffect(() => {
    if (wantsPasswordChange && authUser) {
      setModal({ type: 'changeOwn' })
      router.replace('/settings/users', { scroll: false })
    }
  }, [wantsPasswordChange, authUser, router])

  // Redirect non-admin to graph (unless they came for password change)
  useEffect(() => {
    if (!authLoading && !isAdmin && !wantsPasswordChange && modal.type !== 'changeOwn') {
      router.push('/graph')
    }
  }, [authLoading, isAdmin, wantsPasswordChange, modal, router])

  function resetForm() {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setRole('standard')
    setCurrentPassword('')
    setFormError('')
    setFormSuccess('')
  }

  function openModal(state: ModalState) {
    resetForm()
    setModal(state)
  }

  function closeModal() {
    setModal({ type: 'none' })
    resetForm()
  }

  async function handleCreateUser() {
    setFormError('')
    if (!name || !email) {
      setFormError('姓名和邮箱为必填项')
      return
    }
    if (password && password !== confirmPassword) {
      setFormError('两次输入的密码不一致')
      return
    }

    try {
      await createUser.mutateAsync({
        name,
        email,
        password: password || undefined,
        role,
      })
      closeModal()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '创建用户失败')
    }
  }

  async function handleSetPassword() {
    setFormError('')
    setFormSuccess('')
    if (!password || password.length < 4) {
      setFormError('密码至少需要4个字符')
      return
    }
    if (password !== confirmPassword) {
      setFormError('两次输入的密码不一致')
      return
    }

    if (modal.type !== 'password') return

    try {
      await changePasswordMutation.mutateAsync({
        userId: modal.userId,
        data: { newPassword: password },
      })
      setFormSuccess('密码已更新')
      setPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '修改密码失败') {
    setFormError('')
    setFormSuccess('')
    if (!currentPassword) {
      setFormError('请输入当前密码')
      return
    }
    if (!password || password.length < 4) {
      setFormError('新密码至少需要4个字符')
      return
    }
    if (password !== confirmPassword) {
      setFormError('两次输入的密码不一致')
      return
    }
    if (!authUser) return

    try {
      await changePasswordMutation.mutateAsync({
        userId: authUser.id,
        data: { newPassword: password, currentPassword },
      })
      setFormSuccess('密码修改成功')
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '修改密码失败')
    }
  }

  async function handleDeleteUser() {
    if (modal.type !== 'delete') return
    setFormError('')

    try {
      await deleteUser.mutateAsync(modal.userId)
      closeModal()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '删除用户失败')
    }
  }

  // Show change password modal for standard users
  if (!isAdmin && modal.type === 'changeOwn') {
    return (
      <div className={styles.page}>
        <Modal isOpen onClose={closeModal} title="修改密码" size="small">
          <div className={styles.form}>
            {formError && <div className={styles.error}>{formError}</div>}
            {formSuccess && <div className={styles.success}>{formSuccess}</div>}
            <div className={styles.field}>
              <label className={styles.label}>当前密码</label>
              <input
                type="password"
                className={styles.input}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>新密码</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>确认新密码</label>
              <input
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.actionButton} onClick={closeModal}>取消</button>
              <button
                className="primaryButton"
                onClick={handleChangeOwnPassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? '保存中...' : '修改密码'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>用户管理</h1>
        <button className="primaryButton" onClick={() => openModal({ type: 'create' })}>
          创建用户
        </button>
      </div>

      {isLoading ? (
        <div className={styles.empty}>加载用户中...</div>
      ) : !users || users.length === 0 ? (
        <div className={styles.empty}>暂无用户</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>姓名</th>
              <th className={styles.th}>邮箱</th>
              <th className={styles.th}>角色</th>
              <th className={styles.th}>密码</th>
              <th className={styles.th}>项目数</th>
              <th className={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={styles.tr}>
                <td className={styles.td}>
                  {user.name}
                  {user.id === authUser?.id && <span className={styles.selfLabel}>(我)</span>}
                </td>
                <td className={styles.td}>
                  <span className={styles.email}>{user.email}</span>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${user.role === 'admin' ? styles.badgeAdmin : styles.badgeStandard}`}>
                    {user.role}
                  </span>
                </td>
                <td className={styles.td}>
                  {user.hasPassword ? (
                    <span className={`${styles.badge} ${styles.badgeYes}`}>已设置</span>
                  ) : (
                    <span className={styles.badgeNo}>未设置</span>
                  )}
                </td>
                <td className={styles.td}>{user._count?.projects ?? 0}</td>
                <td className={styles.td}>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => openModal({ type: 'password', userId: user.id, userName: user.name })}
                    >
                      设置密码
                    </button>
                    {user.id !== authUser?.id && (
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => openModal({ type: 'delete', userId: user.id, userName: user.name })}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create User Modal */}
      <Modal isOpen={modal.type === 'create'} onClose={closeModal} title="创建用户">
        <div className={styles.form}>
          {formError && <div className={styles.error}>{formError}</div>}
          <div className={styles.field}>
            <label className={styles.label}>姓名 *</label>
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="张三"
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>邮箱 *</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="zhangsan@example.com"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="留空则为无密码用户"
            />
            <span className={styles.hint}>无密码用户只能通过管理员切换访问</span>
          </div>
          {password && (
            <div className={styles.field}>
              <label className={styles.label}>确认密码</label>
              <input
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>角色</label>
            <select className={styles.select} value={role} onChange={e => setRole(e.target.value)}>
              <option value="standard">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.actionButton} onClick={closeModal}>取消</button>
            <button
              className="primaryButton"
              onClick={handleCreateUser}
              disabled={createUser.isPending}
            >
              {createUser.isPending ? '创建中...' : '创建用户'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Set Password Modal */}
      <Modal
        isOpen={modal.type === 'password'}
        onClose={closeModal}
        title={`设置密码 - ${modal.type === 'password' ? modal.userName : ''}`}
        size="small"
      >
        <div className={styles.form}>
          {formError && <div className={styles.error}>{formError}</div>}
          {formSuccess && <div className={styles.success}>{formSuccess}</div>}
          <div className={styles.field}>
            <label className={styles.label}>新密码</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>确认密码</label>
            <input
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className={styles.modalActions}>
            <button className={styles.actionButton} onClick={closeModal}>取消</button>
            <button
              className="primaryButton"
              onClick={handleSetPassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? '保存中...' : '设置密码'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modal.type === 'delete'}
        onClose={closeModal}
        title="删除用户"
        size="small"
      >
        <div className={styles.form}>
          {formError && <div className={styles.error}>{formError}</div>}
          <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
            确定要删除用户 <strong>{modal.type === 'delete' ? modal.userName : ''}</strong> 吗？
            这将同时删除其所有项目、会话和设置。
          </p>
          <div className={styles.modalActions}>
            <button className={styles.actionButton} onClick={closeModal}>取消</button>
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
              style={{ borderColor: 'var(--status-error)' }}
            >
              {deleteUser.isPending ? '删除中...' : '删除用户'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
