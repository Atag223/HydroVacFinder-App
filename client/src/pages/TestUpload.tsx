import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");

  const handleUpload = async () => {
    console.log("🔴 TEST: Upload button clicked");
    console.log("🔴 TEST: File:", file?.name);
    console.log("🔴 TEST: API Key length:", apiKey.length);

    if (!file || !apiKey) {
      alert("Please select a file and enter API key");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log("🔴 TEST: Sending request...");
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'x-admin-api-key': apiKey,
        },
        body: formData,
      });

      console.log("🔴 TEST: Response status:", response.status);
      
      const data = await response.json();
      console.log("🔴 TEST: Response data:", data);
      
      setResult(JSON.stringify(data, null, 2));
      
      if (response.ok) {
        alert("Upload successful! Image URL: " + data.imageUrl);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      console.error("🔴 TEST: Error:", error);
      setResult("Error: " + error);
      alert("Error: " + error);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Image Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block mb-2">Admin API Key:</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your admin API key"
            />
          </div>

          <div>
            <label className="block mb-2">Image File:</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button onClick={handleUpload}>
            Upload Test
          </Button>

          {result && (
            <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {result}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
