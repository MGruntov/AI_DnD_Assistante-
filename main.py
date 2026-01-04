from retriever import SRDRetriever

# Initialize retriever with the scraped entries
retriever = SRDRetriever("toc_entries.json")

# Single query run
query = "primal path"
results = retriever.retrieve(query, k=10)

print(f"Query: '{query}'")
print("=" * 80)
snippet_length = 80
for i, result in enumerate(results, 1):
    print(f"\n[{i}] {result['title']}")
    print(f"    Path: {' → '.join(result['path']) if result['path'] else 'N/A'}")
    print(f"    Score: {result['score']:.4f}")
    if result.get('contents'):
        print(f"    Contents: {', '.join(result['contents'])}")
    if snippet_length:
        print(f"    Snippet: {result['text'][:snippet_length]}...")
    else:
        print(f"    Text: {result['text']}")
print("\n" + "=" * 80 + "\n")
