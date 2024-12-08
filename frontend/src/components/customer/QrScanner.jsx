import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Camera, Loader2, QrCode } from 'lucide-react';

const VALID_TABLES = {
  TABLE1: 'Table-1',
  TABLE2: 'Table-2',
  TABLE3: 'Table-3',
  TABLE4: 'Table-4',
};

const QrScanner = () => {
  const [tableNumber, setTableNumber] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const navigate = useNavigate();
  const { toast } = useToast();

  const startCamera = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        scanQRCode();
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Using selection mode.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && VALID_TABLES[code.data]) {
          handleSimulateScan(code.data);
          stopCamera();
          return;
        }
      }
      if (isCameraActive) {
        requestAnimationFrame(scan);
      }
    };

    scan();
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleSimulateScan = (tableId) => {
    setTableNumber(VALID_TABLES[tableId]);
    toast({
      title: 'Table Detected',
      description: `Successfully connected to ${VALID_TABLES[tableId]}`,
    });
  };

  const proceedToOrder = () => {
    if (tableNumber) {
      navigate('/order', { state: { tableNumber } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center space-x-2">
              <QrCode className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-center">
                Scan Table QR Code
              </h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera Section */}
            {!tableNumber && (
              <Button
                className="w-full"
                onClick={startCamera}
                disabled={isCameraActive || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Activating Camera...' : 'Start Camera'}
              </Button>
            )}

            {/* Camera View */}
            {isCameraActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-lg border"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-square object-cover"
                />
              </motion.div>
            )}

            {/* Development Testing Section */}
            {!isCameraActive && !tableNumber && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-4"
              >
                {Object.entries(VALID_TABLES).map(([tableId, tableName]) => (
                  <motion.div
                    key={tableId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center p-2"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm mb-2">
                      <QRCodeSVG
                        value={tableId}
                        size={128}
                        level="H"
                        className="mx-auto"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSimulateScan(tableId)}
                    >
                      {tableName}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Table Detection Result */}
            {tableNumber && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-600 font-semibold">
                    Connected to {tableNumber}
                  </p>
                </div>
                <Button className="w-full" size="lg" onClick={proceedToOrder}>
                  Proceed to Order
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default QrScanner;
