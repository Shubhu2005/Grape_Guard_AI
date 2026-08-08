import { Heart } from 'lucide-react';
const Footer = () => {
    return (<footer className="bg-card border-t border-border py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1">
            Developed with <Heart className="w-4 h-4 text-destructive"/> for rural farmers
          </p>
          <p>© 2026 Grape Guard. All rights reserved.</p>
        </div>
      </div>
    </footer>);
};
export default Footer;
