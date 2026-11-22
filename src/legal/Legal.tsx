import type { ReactNode } from "react";
import { CONTACT_EMAIL, SiteShell } from "../site/Site";
import "./legal.css";

const UPDATED = "21 November 2026";

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <main className="legal">
        <h1>{title}</h1>
        <p className="legal-date">Last updated {UPDATED}</p>
        {children}
      </main>
    </SiteShell>
  );
}

const Contact = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        HTML Notebook is a web app for writing notes that are saved as HTML files. It is operated by Ayush Tomar. This
        policy explains what information the app handles, why, and what you can do about it. Questions go to{" "}
        <Contact />.
      </p>

      <h2>What we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your email address.</li>
        <li>If you sign up with a password, a scrambled (hashed) version of it. We never store the password itself.</li>
        <li>A sign-in session, so you stay signed in for up to 30 days.</li>
        <li>
          A short-lived record of failed sign-in and sign-up attempts, used to block password guessing. It is stored
          as a scrambled value built from the email address and network address, and is removed after about 15
          minutes.
        </li>
      </ul>

      <h3>Information from Google</h3>
      <p>
        If you sign in with Google, we receive your Google account email address and whether Google has verified it.
        Signing in does not give the app any access to your Google Drive.
      </p>
      <p>
        If you later choose to connect Google Drive, Google asks you separately for Drive permission, and we receive
        access tokens that let the app reach your Drive. We store them encrypted.
      </p>
      <p>
        When you connect Drive, the app asks Google only for permission to see and manage the files and folders it creates itself. It creates
        one folder called "html-notes-app" and works inside it. It cannot see, read or change anything else in your
        Google Drive.
      </p>

      <h3>Your notes</h3>
      <p>Your notes are stored in the place you choose:</p>
      <ul>
        <li>Google Drive: in the html-notes-app folder of your own Drive.</li>
        <li>
          Your own storage bucket: in the bucket you connect. We store the bucket details and keep its secret key
          encrypted.
        </li>
        <li>Free storage: in storage we manage at Cloudflare R2, in a folder that belongs to your account.</li>
      </ul>
      <p>
        Notes pass through our server on the way to and from that storage. We do not keep a copy of them in our
        database. Up to 10 earlier versions of each page are kept next to the page in the same storage.
      </p>

      <h3>In your browser</h3>
      <ul>
        <li>
          Three necessary cookies: one keeps you signed in, one protects forms against forged requests, and one lasts
          10 minutes while you sign in with Google.
        </li>
        <li>
          A copy of your notes in your browser's storage, so edits are not lost when the connection drops. Synced
          copies are removed when you sign out.
        </li>
        <li>Three settings: the page you last opened, whether autosave is on, and your light or dark theme.</li>
      </ul>
      <p>The app has no advertising or analytics cookies.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your account secure.</li>
        <li>To save, load, list and share your notes.</li>
        <li>To email you a verification code when you sign up with a password.</li>
      </ul>
      <p>We do not sell your information, show ads, or build advertising profiles.</p>

      <h2>How we use Google user data</h2>
      <p>
        HTML Notebook's use and transfer of information received from Google APIs to any other app will adhere to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. In practice:
      </p>
      <ul>
        <li>We use your Google email only to identify your account.</li>
        <li>We use Drive access only to store and read the notes you write in the app.</li>
        <li>We do not transfer Google user data to anyone, except as needed to run the app or to comply with the law.</li>
        <li>We do not use Google user data for advertising or to train AI models.</li>
        <li>
          No person reads your notes, unless you ask us to for support, it is needed for security, or the law
          requires it.
        </li>
      </ul>

      <h2>Sharing a page</h2>
      <p>
        When you create a share link, anyone who has the link can read that page until the link expires or you revoke
        it. A revoked or expired link stops working straight away.
      </p>

      <h2>Companies that process data for us</h2>
      <ul>
        <li>Vercel hosts the website.</li>
        <li>Google Cloud runs the app's server.</li>
        <li>Neon hosts the account database.</li>
        <li>Brevo sends verification emails.</li>
        <li>Cloudflare stores notes for accounts on free storage.</li>
        <li>Google provides sign-in and Drive storage when you choose them.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account details are kept until you ask us to delete the account.</li>
        <li>Unused sign-up verification codes expire after 10 minutes.</li>
        <li>
          Disconnecting Google Drive deletes the stored tokens and withdraws the app's access at Google. Your files
          stay in your Drive.
        </li>
        <li>Disconnecting your own bucket deletes its stored details. Your files stay in your bucket.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          You can remove the app's access to your Google account at any time from your Google Account's security
          settings.
        </li>
        <li>
          To delete your account, email <Contact /> from the address on the account. We delete the account, its
          sessions, its stored credentials and any notes on free storage within 30 days.
        </li>
        <li>You can ask for a copy of the account information we hold about you at the same address.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections use HTTPS. Passwords are hashed, and Google tokens and bucket secret keys are encrypted before
        they are stored. No system is perfectly secure, so we cannot promise that information will never be exposed.
      </p>

      <h2>Children</h2>
      <p>The app is not directed at children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, we will post the new version here and update the date at the top.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms cover your use of HTML Notebook, a web app operated by Ayush Tomar. By creating an account or
        using the app, you agree to them. Questions go to <Contact />.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give a real email address and keep your sign-in details to yourself.</li>
        <li>You are responsible for what happens under your account.</li>
        <li>You must be at least 13 years old to use the app.</li>
      </ul>

      <h2>Your notes</h2>
      <p>
        Your notes belong to you. You give us permission to store, transmit and display them only as needed to run the
        app for you, including serving pages through share links you create.
      </p>
      <p>
        You are responsible for the content of your notes and of any page you share. A share link makes that page
        readable by anyone who has the link.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not use the app to:</p>
      <ul>
        <li>Store or share content that is illegal or that infringes someone else's rights.</li>
        <li>Publish malware, phishing pages or pages built to deceive people.</li>
        <li>Break into, overload or probe the service, or get around its limits.</li>
        <li>Send spam or abuse the sign-up and email verification system.</li>
      </ul>
      <p>We may remove share links or suspend accounts that break these rules.</p>

      <h2>Storage</h2>
      <ul>
        <li>
          Free storage is limited to 50 MB per account. It is offered as a convenience and may change or end. If it
          ends, we will give notice so you can move your notes.
        </li>
        <li>
          If you connect Google Drive or your own bucket, that storage is provided by its owner under their terms. You
          are responsible for its cost, access and backups.
        </li>
      </ul>

      <h2>Open source</h2>
      <p>
        The app's source code is published on GitHub under its own license. These terms cover the hosted service, not
        copies of the software you run yourself.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided as is, without warranties of any kind. We do not promise that it will be uninterrupted,
        error-free, or that notes will never be lost. Keep your own backups of anything important.
      </p>

      <h2>Limit of liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, or for lost data,
        profits or business, arising from your use of the app.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using the app at any time and ask us to delete your account. We may suspend or close accounts
        that break these terms or put the service at risk.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change, we will post the new version here and update the date at the top. Continuing to use the
        app after a change means you accept the new terms.
      </p>
    </LegalPage>
  );
}
