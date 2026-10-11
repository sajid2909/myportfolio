import Reveal from '../components/Reveal'
import { mailtoLink, site } from '../config/site'

export function Contact() {
  return (
    <section id="contact" className="section-y">
      <div className="shell">
        <Reveal>
          <p className="label text-muted">06 / Contact</p>
        </Reveal>

        <Reveal delay={0.05}>
          <p className="label mt-8 text-muted">Have a project or opportunity?</p>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="display-major mt-6 text-paper">
            <span className="block">Let's</span>
            <span className="block">connect.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.16} y={32} amount={0.05}>
          <div className="mt-16 border border-line p-8 md:mt-24 md:p-14">
            <dl className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
              <div>
                <dt className="label text-muted">Email</dt>
                <dd className="mt-4">
                  <a
                    href={mailtoLink}
                    className="body-copy link-underline break-all text-paper transition-colors duration-300 hover:text-hover"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="label text-muted">LinkedIn</dt>
                <dd className="mt-4">
                  <a
                    href={site.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="body-copy link-underline break-all text-paper transition-colors duration-300 hover:text-hover"
                  >
                    {site.linkedinLabel}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="label text-muted">Location</dt>
                <dd className="body-copy mt-4 text-paper">{site.location}</dd>
              </div>
            </dl>

            <div className="mt-12 border-t border-line pt-10 md:mt-14">
              <a href={mailtoLink} className="btn-outline">
                Get in touch <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Contact
