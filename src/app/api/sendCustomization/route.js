import nodemailer from "nodemailer";

export async function POST(req) {
  const body = await req.formData();

  const name = body.get("name");
  const email = body.get("email");
  const phone = body.get("phone");
  const itemType = body.get("itemType");
  const message = body.get("message");
  const image = body.get("image");
  let attachment = [];

  if (image && image.name) {
    const buffer = Buffer.from(await image.arrayBuffer());

    attachment.push({
      filename: image.name,
      content: buffer,
    });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "oriondiamonds1@gmail.com",
      pass: "ntslnclbwswjegvq",
    },
  });

  await transporter.sendMail({
    from: "yourgmail@gmail.com",
    to: "info@oriondiamonds.in",
    subject: "New Customization Request",
    text: `
Name: ${name}
Email: ${email}
Phone: ${phone}
Item Type: ${itemType}

Message:
${message}
    `,
    attachments: attachment,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
  });
}
