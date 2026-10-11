import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'

const capabilities = [
  {
    number: '01',
    title: 'Software Development',
    description:
      'Building and understanding modern software applications, web technologies, and backend services.',
  },
  {
    number: '02',
    title: 'Artificial Intelligence & Machine Learning',
    description:
      'Exploring machine learning concepts, data analysis, Python libraries, and intelligent application development.',
  },
  {
    number: '03',
    title: 'Cloud & DevOps',
    description:
      'Working with cloud fundamentals, Linux, version control, containerization, and deployment workflows.',
  },
  {
    number: '04',
    title: 'Database Development',
    description:
      'Practicing SQL queries, relational database concepts, data management, and backend data integration.',
  },
]

export function Expertise() {
  return (
    <section id="expertise" className="section-y">
      <div className="shell">
        <SectionHeader
          label="02 / Expertise"
          title="What I do."
          description="Four areas of practice — explored with patience, built with care."
        />

        <div className="mt-16 border-t border-line md:mt-20">
          {capabilities.map((capability, index) => (
            <Reveal key={capability.number} delay={0.05 * index}>
              <article className="group grid grid-cols-1 items-baseline gap-4 border-b border-line py-9 transition-colors duration-300 hover:border-hover/40 md:grid-cols-12 md:gap-8 md:py-12">
                <p className="label text-muted md:col-span-1">{capability.number}</p>
                <h3 className="display-row text-paper transition-colors duration-300 group-hover:text-hover md:col-span-5">
                  <span className="inline-block transition-transform duration-500 ease-out group-hover:translate-x-2">
                    {capability.title}
                  </span>
                </h3>
                <p className="body-copy max-w-[46ch] text-paper-dim md:col-span-6">
                  {capability.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Expertise
