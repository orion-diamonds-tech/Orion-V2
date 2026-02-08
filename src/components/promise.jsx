import {
  RefreshCcw,
  Package,
  BadgeCheck,
  ShieldCheck,
  IndianRupee,
  Truck,
  FileBadge,
} from "lucide-react";

export default function OurPromise() {
  const promises = [
    { icon: <IndianRupee className="w-12 h-12" />, text: "80% Buyback" },
    { icon: <RefreshCcw className="w-12 h-12" />, text: "100% Exchange" },
    { icon: <Package className="w-12 h-12" />, text: "Easy 15 Days Return" },
    {
      icon: <FileBadge className="w-12 h-12" />,
      text: <>Certified Jewellery</>,
    },
    { icon: <BadgeCheck className="w-12 h-12" />, text: "Hallmarked Gold" },
    {
      icon: <Truck className="w-12 h-12" />,
      text: "Free Shipping & Insurance",
    },
  ];

  return (
    <section className="py-16 bg-white text-center" id="our-promise">
      <h2 className="text-4xl font-bold text-[#0a1833] mb-12 uppercase">
        Our Promise
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 justify-items-center max-w-6xl mx-auto px-4">
        {promises.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center gap-3"
          >
            <div className="text-[#0a1833]">{item.icon}</div>
            <p className="font-semibold text-base text-[#0a1833]">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
