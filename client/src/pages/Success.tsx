import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Home } from "lucide-react";

export default function Success() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex-1 flex items-center justify-center py-16 md:py-20 px-4">
        <div className="max-w-2xl w-full">
          <Card className="text-center">
            <CardHeader className="space-y-4 pb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-3xl md:text-4xl font-heading">
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-lg text-muted-foreground">
                  Thank you for subscribing to HydroVacFinder!
                </p>
                <p className="text-muted-foreground">
                  Your subscription has been activated successfully. You'll receive a confirmation email with your account details and next steps shortly.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-lg">What's Next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Check your email for account setup instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Complete your business profile to start attracting customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Your listing will appear on the platform within 24 hours</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild size="lg">
                  <Link href="/">
                    <a className="flex items-center gap-2" data-testid="button-home">
                      <Home className="h-4 w-4" />
                      Return Home
                    </a>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">
                    <a className="flex items-center gap-2" data-testid="button-contact">
                      Contact Support
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Link>
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Need help? Contact us at{" "}
                  <a href="mailto:info@hydrovacfinder.com" className="text-primary hover:underline">
                    info@hydrovacfinder.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
