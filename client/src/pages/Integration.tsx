import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Map, Database } from "lucide-react";
import EmbeddableMap from "@/components/EmbeddableMap";

export default function Integration() {
  const embedCode = `<!-- HydroVacFinder Embeddable Map -->
<iframe 
  src="https://hydrovacfinder.com/widget" 
  width="100%" 
  height="500" 
  frameborder="0"
  title="HydroVacFinder Map"
></iframe>`;

  const apiExampleCompanies = `// Fetch all companies
fetch('https://hydrovacfinder.com/api/public/v1/companies')
  .then(res => res.json())
  .then(data => {
    console.log(\`Found \${data.count} companies\`);
    data.data.forEach(company => {
      console.log(\`\${company.name} - \${company.tier}\`);
    });
  });

// Filter by tier and state
fetch('https://hydrovacfinder.com/api/public/v1/companies?tier=featured&state=Texas')
  .then(res => res.json())
  .then(data => console.log(data));

// Limit results
fetch('https://hydrovacfinder.com/api/public/v1/companies?limit=10')
  .then(res => res.json())
  .then(data => console.log(data));`;

  const apiExampleDisposal = `// Fetch all disposal sites
fetch('https://hydrovacfinder.com/api/public/v1/disposal-sites')
  .then(res => res.json())
  .then(data => {
    console.log(\`Found \${data.count} disposal sites\`);
    data.data.forEach(site => {
      console.log(\`\${site.name} - \${site.address}\`);
    });
  });

// Filter by state
fetch('https://hydrovacfinder.com/api/public/v1/disposal-sites?state=California')
  .then(res => res.json())
  .then(data => console.log(data));`;

  const responseExample = `{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "name": "ABC Hydrovac Services",
      "address": "123 Main St, Houston, TX 77001",
      "phone": "(555) 123-4567",
      "email": "contact@abchydrovac.com",
      "website": "https://abchydrovac.com",
      "description": "Professional hydrovac services...",
      "services": ["Hydro Excavation", "Vacuum Services"],
      "coverageArea": "Houston Metro Area",
      "location": {
        "lat": 29.7604,
        "lng": -95.3698
      },
      "tier": "featured",
      "logoUrl": "https://..."
    }
  ]
}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Integration Guide</h1>
            <p className="text-xl text-muted-foreground">
              Embed our map or access company data via API
            </p>
          </div>

          <Tabs defaultValue="widget" className="mb-12">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="widget" data-testid="tab-widget">
                <Map className="w-4 h-4 mr-2" />
                Embeddable Widget
              </TabsTrigger>
              <TabsTrigger value="api" data-testid="tab-api">
                <Database className="w-4 h-4 mr-2" />
                API Endpoints
              </TabsTrigger>
              <TabsTrigger value="demo" data-testid="tab-demo">
                <Code className="w-4 h-4 mr-2" />
                Live Demo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="widget" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Embed the Map on Your Website</CardTitle>
                  <CardDescription>
                    Copy and paste this code into your HTML to display the interactive map
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-sm overflow-x-auto">
                      <code>{embedCode}</code>
                    </pre>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Customization Options:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Adjust <code className="bg-muted px-1 rounded">width</code> and <code className="bg-muted px-1 rounded">height</code> to fit your layout</li>
                      <li>Add query parameters to filter: <code className="bg-muted px-1 rounded">?tier=featured&state=Texas</code></li>
                      <li>Responsive by default - uses 100% width</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>REST API Endpoints</CardTitle>
                  <CardDescription>
                    Access company and disposal site data programmatically
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">GET</span>
                      /api/public/v1/companies
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fetch all hydrovac companies with optional filtering
                    </p>
                    <div className="bg-muted p-4 rounded-md mb-3">
                      <pre className="text-xs overflow-x-auto">
                        <code>{apiExampleCompanies}</code>
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Query Parameters:</h4>
                      <ul className="space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">tier</code> - Filter by tier (free, verified, featured, premium)</li>
                        <li><code className="bg-muted px-1 rounded">state</code> - Filter by state name</li>
                        <li><code className="bg-muted px-1 rounded">limit</code> - Limit number of results</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">GET</span>
                      /api/public/v1/disposal-sites
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fetch all disposal facilities with optional filtering
                    </p>
                    <div className="bg-muted p-4 rounded-md mb-3">
                      <pre className="text-xs overflow-x-auto">
                        <code>{apiExampleDisposal}</code>
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Query Parameters:</h4>
                      <ul className="space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">state</code> - Filter by state name</li>
                        <li><code className="bg-muted px-1 rounded">limit</code> - Limit number of results</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-2">Response Format:</h4>
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-xs overflow-x-auto">
                        <code>{responseExample}</code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="demo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Demo</CardTitle>
                  <CardDescription>
                    See the embeddable map in action
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmbeddableMap 
                    height="500px"
                    showCompanies={true}
                    showDisposalSites={true}
                  />
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      This is the same interactive map that you can embed on your website. 
                      Blue markers represent hydrovac companies, green markers are disposal sites.
                      Click on any marker to see detailed information.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Our team is here to assist with your integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Technical Support</h4>
                  <p className="text-sm text-muted-foreground">
                    Email: <a href="mailto:info@hydrovacfinder.com" className="text-primary hover:underline">
                      info@hydrovacfinder.com
                    </a>
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Rate Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    Currently no rate limits. Contact us for enterprise-level access.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
