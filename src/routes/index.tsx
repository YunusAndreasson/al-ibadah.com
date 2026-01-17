import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '~/components/layout/PageLayout'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <PageLayout largePadding>
      <section>
          <div className="prose-reading">
            <p className="text-center mb-6">
              <span className="font-arabic text-xl leading-relaxed">بسم الله الرحمن الرحيم</span>
              <br />
              <span className="text-muted-foreground">
                I Allāhs den Barmhärtiges den Nåderikes namn
              </span>
            </p>

            <p>
              All lovprisan tillhör Allāh den Högste. Vi ber om Hans hjälp och vi ber om Hans
              förlåtelse. Vi söker vår tillflykt hos Honom från det onda i våra inre och från våra
              onda handlingar. Den som Allāh vägleder kan ingen leda vilse och den som Allāh låter
              ledas vilse kan ingen vägleda. Jag vittnar om att det inte finns någon gudom värdig
              att dyrka utom Allāh som är en och utan medhjälpare, och jag vittnar om att Muḥammad
              är Hans tjänare och sändebud.
            </p>

            <p>
              <strong>Vem vänder sig denna webbplats till?</strong> Denna webbplats vänder sig till
              dig som vill följa islam baserat på Koranen, profetens – över honom vare Guds frid och
              välsignelser – <em>sunnah</em> och de rättfärdiga följeslagarna. Detta utefter de
              lärdas förklaringar. Är du intresserad av en mer allmän och grundläggande information
              om islam rekommenderas varmt <a href="https://islam.se">islam.se</a>.
            </p>

            <p>
              <strong>Vilka lärda hänvisas det till?</strong> Här finner du texter av bland andra
              imamerna Ibn ʿAbdullāh Ibn Bāz, Muḥammad bin Ṣāliḥ al-ʿUthaymīn, Muḥammad Nāṣir-ud-Dīn
              al-Albānī och Ibn ʿAbdur-Raḥmān al-Jibrīn (<em>raḥima-humu-llāh</em>) främst hämtade
              från samlingarna <em>Fatāwā Islāmiyyah</em> och <em>Fatāwā Arkān ul-Islām</em>.
            </p>

            <p>
              <strong>Är materialet fritt att kopiera?</strong> Du får gärna använda materialet på
              din egen blogg/forum eller sprida det vidare till nära och kära så länge du inte
              kopierar hela webbplatsen eller gör materialet tillgängligt i kommersiella syften. Du
              behöver inte länka tillbaka men var noga med att ange en korrekt källhänvisning så att
              det framkommer vem det är som har givit utlåtandet.
            </p>

            <p>
              Vi ber vår Herre den Allsmäktige – som det inte finns någon annan än Honom att dyrka,
              den Levande som aldrig dör – att Han förlåter bristerna i detta arbete, att Han godtar
              det och belönar oss samt gör det till något nyttigt för dem som tar del av det.
            </p>

            <p className="text-muted-foreground">
              Må frid och välsignelser vara över profeten Muḥammad, hans familj och hans
              följeslagare.
            </p>
          </div>
      </section>
    </PageLayout>
  )
}
