import Link from 'next/link'

/** Liens de l’équipe dans le menu de /admin (à enregistrer en `admin.components.afterNavLinks`). */
export function LiensEquipe() {
  return (
    <nav className="ae-links" aria-label="Outils de l’équipe">
      <style dangerouslySetInnerHTML={{ __html: '.ae-links{display:grid;gap:2px;padding:8px 0}.ae-links a{display:block;padding:4px 0;color:var(--theme-text);text-decoration:none}.ae-links a:hover{text-decoration:underline}' }} />
      <Link prefetch={false} href="/admin/validation">Validation</Link>
      <Link prefetch={false} href="/admin/import">Importer des adresses</Link>
      <Link prefetch={false} href="/admin/rubriques">Rubriques</Link>
      <Link prefetch={false} href="/admin/controle">Contrôle</Link>
    </nav>
  )
}
