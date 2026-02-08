import { FiMail, FiPhone, FiInstagram } from "react-icons/fi";

export function Footer() {
  return (
    <footer className="bg-gradient-to-t from-gray-50 via-white to-gray-100 text-[#0a1833]">
      {/* === CONTACT SECTION === */}
      <section
        id="contact"
        className="py-20 px-6 border-b border-gray-300/50 text-center"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#0a1833]">
            Contact Us
          </h2>

          <p className="mt-3 text-gray-700 text-sm md:text-base">
            Have questions or want to know more? Reach out to us anytime.
          </p>

          <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 text-gray-700">
            <a
              href="mailto:info@oriondiamonds.in"
              className="flex items-center gap-2 hover:text-[#0a1833] transition font-medium"
            >
              <FiMail size={18} />
              <span>info@oriondiamonds.in</span>
            </a>

            <a
              href="tel:+917022253092"
              className="flex items-center gap-2 hover:text-[#0a1833] transition font-medium"
            >
              <FiPhone size={18} />
              <span>+91 7022253092</span>
            </a>

            <a
              href="https://www.instagram.com/oriondiamonds.in?igsh=MWdqZW00ODczZ2tqNA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-pink-600 transition font-medium"
            >
              <FiInstagram size={18} />
              <span>@oriondiamonds.in</span>
            </a>
          </div>
        </div>
      </section>

      {/* === FOOTER BASE === */}
      <div className="border-t border-gray-300/50 py-6 px-4 text-center text-gray-600 text-sm">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-[#0a1833]">Orion Diamonds</span> —
          All rights reserved.
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-gray-500">
          Powered by
          <span className="font-semibold text-[#0a1833]">Neural Pulse</span>
        </p>
      </div>
    </footer>
  );
}
