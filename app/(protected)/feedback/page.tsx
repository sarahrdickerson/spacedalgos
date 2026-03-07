import FeedbackForm from "./_components/feedback-form";

const CAT_IMAGES = [
  "/images/cats/cat1.jpeg",
  "/images/cats/cat2.jpeg",
  "/images/cats/cat3.png",
  "/images/cats/cat4.png",
  "/images/cats/cat5.jpeg",
  "/images/cats/cat6.jpeg",
  "/images/cats/cat7.jpeg",
  "/images/cats/cat8.png",
  "/images/cats/cat9.jpeg",
  "/images/cats/cat10.png",
  "/images/cats/cat11.png",
  "/images/cats/cat12.jpeg",
  "/images/cats/cat13.jpeg",
  "/images/cats/cat14.jpeg",
  "/images/cats/cat15.jpeg",
];

export default function FeedbackPage() {
  return <FeedbackForm catImages={CAT_IMAGES} />;
}
