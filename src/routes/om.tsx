import { createFileRoute, Link } from '@tanstack/react-router'
import { PageLayout } from '~/components/layout/PageLayout'

export const Route = createFileRoute('/om')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <PageLayout largePadding>
      <section>
        <div className="prose-reading">
          <p className="text-center mb-6">
            <span className="font-arabic text-xl leading-relaxed">بسم الله الرحمن الرحيم</span>
            <br />
            <span className="text-muted-foreground">
              I Allahs den Barmhärtiges den Nåderikes namn
            </span>
          </p>

          <h3 className="!text-sm font-semibold uppercase tracking-wide text-foreground/70 !mb-3 !mt-8 first:!mt-0">Om webbplatsen</h3>
          <p>
            al-Ibadah samlar religiösa utlåtanden för svensktalande muslimer som vill praktisera
            sin tro i enlighet med Koranen och profetens <em>sunnah</em> – fred och välsignelser
            vare över honom – så som den förståtts av islams första generationer och förklarats av
            erkända lärda. Webbplatsen har funnits sedan 2007 och vänder sig till den som redan har
            grundläggande kunskap om islam. Den som söker en introduktion till religionen
            rekommenderas <a href="https://islam.se">islam.se</a>.
          </p>

          <h3 className="!text-sm font-semibold uppercase tracking-wide text-foreground/70 !mb-3 !mt-8 first:!mt-0">Källor</h3>
          <p>
            Utlåtandena är översatta från <em>Fatāwā Islāmiyyah</em> och{' '}
            <em>Fatāwā Arkān ul-Islām</em>, samlingar av utlåtanden från erkända sunnitiska lärda:{' '}
            <Link to="/biografier/shaykh-abdul-aziz-ibn-abdullah-ibn-abdur-rahman-ib">
              Ibn Bāz
            </Link>
            , <Link to="/biografier/shaykh-muhammad-ibn-salih-ibn-uthaymin">Ibn Uthaymīn</Link>,{' '}
            <Link to="/biografier/muhammad-nasir-ud-din-al-albani">al-Albānī</Link> och{' '}
            <Link to="/biografier/ibn-abdur-rahman-al-jibrin">al-Jibrīn</Link> –{' '}
            <em>rahimahum Allah</em>.
          </p>

          <h3 className="!text-sm font-semibold uppercase tracking-wide text-foreground/70 !mb-3 !mt-8 first:!mt-0">Att vara muslim i Sverige</h3>
          <p>
            Utlåtandena är i huvudsak allmängiltiga, men vissa texter berör frågor som kan kräva
            lokalt perspektiv. Läsaren uppmanas att sätta sig in i principerna bakom utlåtandena
            och vid behov rådgöra med kunniga i sin närhet.
          </p>

          <h3 className="!text-sm font-semibold uppercase tracking-wide text-foreground/70 !mb-3 !mt-8 first:!mt-0">Upphovsrätt</h3>
          <p>
            Översättningarna är licensierade under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.sv"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC-BY-4.0
            </a>{' '}
            och får spridas fritt med källhänvisning.
          </p>

          <h3 className="!text-sm font-semibold uppercase tracking-wide text-foreground/70 !mb-3 !mt-8 first:!mt-0">Kontakt</h3>
          <p>
            Webbplatsen översätts och underhålls av{' '}
            <a href="mailto:yunus@edenmind.com">Yunus Andréasson</a>. Frågor om webbplatsen eller
            språkliga fel tas gärna emot. För religiösa frågor hänvisas till lokala lärda eller
            erkända kunskapskällor.
          </p>

          <p className="text-muted-foreground">
            Må Allah godta detta arbete och göra det till nytta. Fred och välsignelser över
            profeten Muhammad, hans familj och hans följeslagare.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
