import { Link } from "wouter";

const footerSections = [
  {
    title: "Categories",
    links: [
      { name: "Technology", href: "/?category=technology" },
      { name: "Business", href: "/?category=business" },
      { name: "Science", href: "/?category=science" },
      { name: "Politics", href: "/?category=politics" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Connect",
    links: [
      { name: "Twitter", href: "https://twitter.com/newsai" },
      { name: "LinkedIn", href: "https://linkedin.com/company/newsai" },
      { name: "RSS Feed", href: "/rss" },
      { name: "Newsletter", href: "/newsletter" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/">
              <div className="flex items-center space-x-2 mb-4" data-testid="footer-logo">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">N</span>
                </div>
                <span className="font-bold text-foreground">NewsAI</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground" data-testid="footer-description">
              AI-powered news platform delivering fact-checked, humanized articles from trusted sources worldwide.
            </p>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-foreground mb-3" data-testid={`footer-${section.title.toLowerCase()}-title`}>
                {section.title}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                        data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link href={link.href}>
                        <span
                          className="hover:text-foreground transition-colors cursor-pointer"
                          data-testid={`footer-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {link.name}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p data-testid="footer-copyright">
            &copy; 2024 NewsAI. All rights reserved. Powered by AI and human editorial oversight.
          </p>
        </div>
      </div>
    </footer>
  );
}
