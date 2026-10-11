import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'

const skillCategories: { heading: string; items: string[] }[] = [
  { heading: 'Programming Languages', items: ['Python', 'SQL', 'JavaScript'] },
  { heading: 'Frontend', items: ['HTML5', 'CSS3', 'JavaScript', 'React'] },
  { heading: 'Backend', items: ['Python', 'FastAPI'] },
  { heading: 'Databases', items: ['Microsoft SQL Server', 'PostgreSQL'] },
  {
    heading: 'Cloud',
    items: ['Microsoft Azure', 'AWS Fundamentals', 'Google Cloud Fundamentals'],
  },
  {
    heading: 'DevOps',
    items: ['Git', 'GitHub', 'Linux', 'Docker', 'CI/CD Fundamentals'],
  },
  {
    heading: 'AI & Machine Learning',
    items: [
      'Python',
      'Pandas',
      'NumPy',
      'Scikit-learn',
      'Data Preprocessing',
      'Machine Learning Fundamentals',
    ],
  },
  {
    heading: 'Networking Fundamentals',
    items: ['TCP/IP', 'DNS', 'HTTP/HTTPS', 'Client-Server Architecture'],
  },
  {
    heading: 'Development Tools',
    items: ['VS Code', 'Git Bash', 'SQL Server Management Studio', 'Google Colab', 'Vercel', 'Netlify'],
  },
]

export function Skills() {
  return (
    <section id="skills" className="section-y">
      <div className="shell">
        <SectionHeader
          label="03 / Skills"
          title="Tools & technologies."
          description="An index of the languages, platforms, and tools I work with and continue to explore."
        />

        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-14 sm:grid-cols-2 lg:mt-24 lg:grid-cols-3">
          {skillCategories.map((category, index) => (
            <Reveal key={category.heading} delay={0.04 * (index % 3)}>
              <div>
                <h3 className="label border-b border-line pb-4 text-paper">{category.heading}</h3>
                <ul className="mt-4">
                  {category.items.map((item) => (
                    <li
                      key={item}
                      className="body-copy py-1.5 text-paper-dim transition-colors duration-300 hover:text-hover"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Skills
