"""Quick smoke-test for the RAG and CNN services."""
from services.rag_service import retrieve_recommendations, build_rag_context
from services.cnn_service import predict_disease

diseases = ["Downy Mildew", "Powdery Mildew", "Anthracnose", "Black Rot", "Healthy", "Botrytis"]

print("=== RAG Retrieval Test ===")
for d in diseases:
    recs = retrieve_recommendations(d, top_k=5)
    print(f"\n{d}: {len(recs)} recommendations")
    for r in recs:
        name = r.get("pesticide_name", "?")
        dosage = r.get("dosage", "?")
        print(f"  - {name} | {dosage}")

print("\n=== RAG Context Build Test ===")
recs = retrieve_recommendations("Powdery Mildew")
ctx = build_rag_context(recs)
print(ctx[:300])

print("\n=== CNN Heuristic Fallback Test ===")
# Create a simple green image to test healthy detection
from PIL import Image
import io
img = Image.new("RGB", (224, 224), (50, 150, 50))
buf = io.BytesIO()
img.save(buf, format="PNG")
result = predict_disease(buf.getvalue())
print(f"Green image -> {result['disease_name']} (conf={result['confidence']}, src={result['source']})")

# Red image
img2 = Image.new("RGB", (224, 224), (200, 60, 40))
buf2 = io.BytesIO()
img2.save(buf2, format="PNG")
result2 = predict_disease(buf2.getvalue())
print(f"Red image -> {result2['disease_name']} (conf={result2['confidence']}, src={result2['source']})")

print("\n=== All smoke tests passed ===")
