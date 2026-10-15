import { ArrowDown, ArrowUpRight, Asterisk } from "lucide-react";
import { MintForm } from "@/components/MintForm";
import { EnsLookup } from "@/components/EnsLookup";
import { Gallery } from "@/components/Gallery";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-cross">+</span> A SPACE FOR YOUR NEXT ORIGINAL
          </div>
          <h1>
            Make something
            <br />
            worth <em>keeping.</em>
          </h1>
          <p>
            Your image. Your story. Your own little piece of the chain.
            <br className="desktop-only" /> Turn an original into a one-of-one
            edition, in a few simple steps.
          </p>
          <a className="button orange" href="#create">
            Create your edition <ArrowUpRight size={18} />
          </a>
          <a className="hero-secondary" href="#how-it-works">
            A first-time minter? Start here <ArrowDown size={13} />
          </a>
          <div className="hero-footnote">
            <span className="status-dot" /> FREE TO MINT <span>—</span> JUST
            SEPOLIA NETWORK FEES
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label="Abstract studio print: a terracotta sun and cobalt arch"
        >
          <div className="print-offset" />
          <div className="art-print">
            <div className="print-top">
              <span>EDITION STUDIES</span>
              <Asterisk size={19} />
            </div>
            <div className="abstract-art">
              <div className="art-sun" />
              <div className="art-arch" />
              <div className="art-line one" />
              <div className="art-line two" />
              <div className="art-small-circle" />
            </div>
            <div className="print-bottom">
              <span>FORM & FEELING</span>
              <span>STUDY № 001</span>
            </div>
          </div>
          <div className="print-note">
            A blank canvas. Endless possibilities.
            <span>YOUR NEXT ORIGINAL ↗</span>
          </div>
          <div className="round-stamp">
            MADE BY YOU<span>✳</span>KEPT ONCHAIN
          </div>
        </div>
      </section>
      <section id="how-it-works" className="steps">
        <div className="step">
          <span>01</span>
          <div>
            <h3>Bring your original</h3>
            <p>A photograph, a sketch, a happy accident.</p>
          </div>
        </div>
        <div className="step">
          <span>02</span>
          <div>
            <h3>Give it a permanent home</h3>
            <p>Your image and story, pinned to IPFS.</p>
          </div>
        </div>
        <div className="step">
          <span>03</span>
          <div>
            <h3>Make it an edition</h3>
            <p>Mint to your wallet. Share it with the world.</p>
          </div>
        </div>
      </section>
      <MintForm />
      <EnsLookup />
      <Gallery preview />
    </>
  );
}
