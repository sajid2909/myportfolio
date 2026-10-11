import { gmailComposeLink, site } from '../config/site'

// Computed once at module load — keeps render pure for the React Compiler.
const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="hairline">
      <div className="shell flex flex-col items-start gap-5 py-8 md:flex-row md:items-center md:justify-between md:gap-6">
        <p className="label text-muted">© {year} {site.name.toUpperCase()}</p>
        <p className="label text-muted">{site.titleFooter}</p>
        <a
          href={gmailComposeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="label link-underline transition-colors duration-300 hover:text-hover"
        >
          Get in Touch ↑
        </a>
      </div>
    </footer>
  )
}

export default Footer
